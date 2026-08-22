// Node(next start) 실행용 Cloudflare 바인딩 심 주입 (ebs 홈서버 이전, 2026-07-19).
//
// @opennextjs/cloudflare 의 getCloudflareContext() 는 전역 심볼
// `Symbol.for("__cloudflare-context__")` 를 읽는다. Workers 밖(Node standalone)에서
// 이 심볼에 파일 KV / SQLite D1 / fire-and-forget waitUntil 을 넣어 주면
// 앱 코드(appCache()/riskDb()/bg())를 한 줄도 고치지 않고 그대로 동작한다.
// 실제 Workers 런타임에서는 심볼이 이미 존재하므로 이 파일은 아무 일도 하지 않는다.
//
// 환경변수:
//   KV_SHIM_DIR   파일 KV 디렉터리 (기본 .kv/SHORTS_CACHE)
//   D1_SHIM_PATH  SQLite 파일 경로 (설정 시 RISK_DB 바인딩 제공)

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const sym = Symbol.for("__cloudflare-context__");
  const g = globalThis as Record<PropertyKey, unknown>;
  if (g[sym]) return;

  const { mkdir, readFile, writeFile, rename, unlink } = await import("node:fs/promises");
  const { join, resolve } = await import("node:path");

  const EXP = ".__kvexp__";

  class FileKV {
    constructor(private dir: string) {}

    private path(key: string) {
      return join(this.dir, encodeURIComponent(key));
    }

    async get(key: string, typeOrOpts?: unknown): Promise<unknown> {
      const type =
        typeof typeOrOpts === "string"
          ? typeOrOpts
          : ((typeOrOpts as { type?: string } | undefined)?.type ?? "text");
      try {
        const expRaw = await readFile(this.path(key) + EXP, "utf8").catch(() => null);
        if (expRaw && Date.now() > Number(expRaw)) {
          await this.delete(key);
          return null;
        }
        const buf = await readFile(this.path(key));
        if (type === "json") return JSON.parse(buf.toString("utf8"));
        if (type === "arrayBuffer") {
          return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        }
        return buf.toString("utf8");
      } catch {
        return null;
      }
    }

    async put(key: string, value: unknown, opts?: { expirationTtl?: number }) {
      await mkdir(this.dir, { recursive: true });
      const buf =
        typeof value === "string"
          ? Buffer.from(value)
          : value instanceof ArrayBuffer
            ? Buffer.from(value)
            : Buffer.from(String(value));
      const tmp = this.path(key) + ".tmp-" + process.pid;
      await writeFile(tmp, buf);
      await rename(tmp, this.path(key));
      if (opts?.expirationTtl) {
        await writeFile(this.path(key) + EXP, String(Date.now() + opts.expirationTtl * 1000));
      } else {
        await unlink(this.path(key) + EXP).catch(() => {});
      }
    }

    async delete(key: string) {
      await unlink(this.path(key)).catch(() => {});
      await unlink(this.path(key) + EXP).catch(() => {});
    }
  }

  const env: Record<string, unknown> = {
    SHORTS_CACHE: new FileKV(resolve(process.env.KV_SHIM_DIR ?? ".kv/SHORTS_CACHE")),
  };

  if (process.env.D1_SHIM_PATH) {
    // @ts-expect-error -- 이 @types/node 버전에 node:sqlite 선언이 없다 (Node 22+ 런타임엔 존재)
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(process.env.D1_SHIM_PATH);
    db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=10000;");

    const normalize = (v: unknown) =>
      v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v;

    class Stmt {
      constructor(
        private sql: string,
        private params: unknown[] = [],
      ) {}

      bind(...params: unknown[]) {
        return new Stmt(this.sql, params.map(normalize));
      }

      async first(col?: string) {
        const row = (db.prepare(this.sql).get(...(this.params as never[])) ?? null) as Record<
          string,
          unknown
        > | null;
        if (row === null) return null;
        return col !== undefined ? (row[col] ?? null) : row;
      }

      async all() {
        const results = db.prepare(this.sql).all(...(this.params as never[]));
        return { success: true, results, meta: {} };
      }

      async run() {
        const info = db.prepare(this.sql).run(...(this.params as never[]));
        return {
          success: true,
          results: [],
          meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) },
        };
      }
    }

    env.RISK_DB = {
      prepare: (sql: string) => new Stmt(sql),
      batch: async (stmts: Stmt[]) => {
        db.exec("BEGIN");
        try {
          const out = [];
          for (const s of stmts) out.push(await s.run());
          db.exec("COMMIT");
          return out;
        } catch (err) {
          db.exec("ROLLBACK");
          throw err;
        }
      },
    };
  }

  g[sym] = {
    env,
    ctx: {
      waitUntil: (p: Promise<unknown>) => {
        Promise.resolve(p).catch((e) => console.error("[waitUntil]", e));
      },
      passThroughOnException: () => {},
    },
    cf: {},
  };
  console.log(
    `[instrumentation] Cloudflare 심 주입 완료 (KV=${process.env.KV_SHIM_DIR ?? ".kv"}, D1=${process.env.D1_SHIM_PATH ?? "없음"})`,
  );
}
