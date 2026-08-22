import Link from "next/link";
import type { Metadata } from "next";
import { MEMBERS } from "@/lib/analysis/members";
import { ENABLED_SOURCES, SOURCE_LABELS } from "@/lib/feed/config";

export const metadata: Metadata = {
  title: "키키 코멘트 라이브 — 팬 반응을 한 화면에",
  description:
    "유튜브 댓글을 라이브 채팅처럼 되감고, 뉴스·커뮤니티·인스타 반응을 한 스트림으로 모으고, 멤버별 여론 리스크를 관제합니다.",
};

// The eight header modes of the app, grouped by what they operate on.
const FEATURES = [
  {
    badge: "재생",
    title: "댓글을 라이브 채팅으로",
    body: "영상에 이미 달린 댓글을 시간 순으로 흘려보냅니다. 재생·속도·정렬·반복, 영상만 남기는 시어터 모드까지.",
    modes: ["라이브", "동기화", "목록"],
  },
  {
    badge: "탐색",
    title: "채널 전체를 가로질러",
    body: "한 영상이 아니라 채널 단위로 봅니다. 좋아요 상위 댓글을 모은 전당과, 전체 댓글 전문 검색.",
    modes: ["전당", "검색"],
  },
  {
    badge: "수집",
    title: "흩어진 반응을 한 스트림에",
    body: "유튜브 밖의 이야기까지 끌어옵니다. 소스별 칩으로 걸러 보고, 카드에서 원문으로 바로 넘어갑니다.",
    modes: ["피드"],
  },
  {
    badge: "판독",
    title: "감성과 키워드로 나눠 보기",
    body: "댓글을 긍정·중립·부정으로 채점하고 자주 나온 키워드를 뽑습니다. 멤버별·소스별로 갈라 봅니다.",
    modes: ["분석"],
  },
  {
    badge: "관제",
    title: "여론 리스크를 시계열로",
    body: "2시간마다 스냅샷을 떠 멤버별 위협 레벨, 언급·부정 추이, 경보 피드, 소스 매트릭스, 채터 클라우드를 그립니다. 경보는 채널 자신의 baseline에서 벗어날 때만 울립니다.",
    modes: ["리스크"],
  },
] as const;

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent">
      {children}
    </span>
  );
}

export default function AboutPage() {
  return (
    <main className="min-h-dvh bg-[var(--bg)]">
      {/* ───────────── Header ───────────── */}
      <header className="sticky top-0 z-10 border-b border-line bg-[var(--surface)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-5 py-3.5 sm:px-8">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-[18px] font-extrabold tracking-tight text-ink">
            KiiiKiii
          </span>
          <Pill>소개</Pill>
          <Link
            href="/"
            className="ml-auto rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-accent-ink"
          >
            대시보드 열기
          </Link>
        </div>
      </header>

      {/* ───────────── Hero ───────────── */}
      <section className="mx-auto max-w-5xl px-5 pt-16 pb-14 sm:px-8 sm:pt-24 sm:pb-20">
        <p className="rise text-[13px] font-bold tracking-wide text-accent">
          KiiiKiii · 지유 이솔 수이 하음 키야
        </p>
        <h1 className="rise mt-4 text-[34px] leading-[1.15] font-extrabold tracking-tight text-ink sm:text-[52px]">
          팬들이 남긴 말을,
          <br />
          한 화면에서 읽습니다.
        </h1>
        <p className="rise mt-6 max-w-2xl text-[16px] leading-relaxed text-muted sm:text-[18px]">
          유튜브 댓글을 라이브 채팅처럼 되감고, 뉴스·커뮤니티·인스타에 흩어진
          반응을 하나의 스트림으로 모으고, 멤버별 여론 리스크를 시계열로
          관제합니다.
        </p>
        <div className="rise mt-9 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-accent px-6 py-3 text-[15px] font-bold text-white transition-colors hover:bg-accent-ink"
          >
            대시보드 열기
          </Link>
          <a
            href="https://github.com/seongilp/kiki.unflix.tv"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-line-strong bg-[var(--surface)] px-6 py-3 text-[15px] font-bold text-muted transition-colors hover:text-ink"
          >
            GitHub
          </a>
          <a
            href="https://www.youtube.com/@KiiiKiii_starship"
            target="_blank"
            rel="noreferrer"
            className="rounded-full px-2 py-3 text-[15px] font-semibold text-faint transition-colors hover:text-ink"
          >
            공식 채널 ↗
          </a>
        </div>
      </section>

      {/* ───────────── Features ───────────── */}
      <section className="mx-auto max-w-5xl px-5 pb-6 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <article
              key={f.title}
              className={`rounded-2xl border border-line bg-[var(--surface)] p-6 ${
                i === FEATURES.length - 1 ? "sm:col-span-2" : ""
              }`}
            >
              <Pill>{f.badge}</Pill>
              <h2 className="mt-4 text-[19px] font-extrabold tracking-tight text-ink">
                {f.title}
              </h2>
              <p className="mt-2.5 text-[14px] leading-relaxed text-muted">
                {f.body}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {f.modes.map((m) => (
                  <span
                    key={m}
                    className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[12px] font-semibold text-faint"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ───────────── Sources + roster ───────────── */}
      <section className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-[var(--surface)] p-6">
            <h2 className="text-[19px] font-extrabold tracking-tight text-ink">
              읽는 곳
            </h2>
            <p className="mt-2.5 text-[14px] leading-relaxed text-muted">
              유튜브 댓글에 더해 아래 소스를 주기적으로 긁어 하나의 피드로
              합칩니다. 중복은 URL 기준으로 걸러집니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-bold text-accent">
                유튜브
              </span>
              {ENABLED_SOURCES.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-bold text-accent"
                >
                  {SOURCE_LABELS[s]}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-[var(--surface)] p-6">
            <h2 className="text-[19px] font-extrabold tracking-tight text-ink">
              보는 사람
            </h2>
            <p className="mt-2.5 text-[14px] leading-relaxed text-muted">
              댓글 속 이름은 조사까지 감안해 잡아냅니다. &ldquo;수이는&rdquo;,
              &ldquo;하음이가&rdquo; 모두 같은 멤버로 셉니다.
            </p>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {MEMBERS.map((m) => (
                <li
                  key={m.key}
                  className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-[13px] font-bold text-ink"
                >
                  {m.name}
                  <span className="ml-1.5 text-[12px] font-semibold text-faint uppercase">
                    {m.key}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ───────────── How it works ───────────── */}
      <section className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
        <div className="rounded-2xl border border-line bg-[var(--surface)] p-6 sm:p-8">
          <h2 className="text-[19px] font-extrabold tracking-tight text-ink">
            동작 방식
          </h2>
          <ol className="mt-5 grid gap-5 sm:grid-cols-3">
            {[
              {
                n: "01",
                t: "모읍니다",
                d: "채널과 업로드를 해석해 댓글을 페이지 단위로 받아오고, 뉴스·커뮤니티·인스타 어댑터가 각자 소스를 정규화합니다.",
              },
              {
                n: "02",
                t: "읽습니다",
                d: "한국어 어간 사전으로 감성을 채점하고 키워드를 뽑습니다. 조사를 떼어내 “수이는”과 “수이”를 한 단어로 셉니다.",
              },
              {
                n: "03",
                t: "지켜봅니다",
                d: "2시간마다 스냅샷을 시계열로 쌓고, 자기 자신의 baseline에서 벗어나는 순간에만 경보를 올립니다.",
              },
            ].map((s) => (
              <li key={s.n}>
                <span className="num text-[13px] font-extrabold text-accent">
                  {s.n}
                </span>
                <h3 className="mt-1.5 text-[15px] font-extrabold text-ink">
                  {s.t}
                </h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
                  {s.d}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────── Footer ───────────── */}
      <footer className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-8 text-[13px] text-faint">
          <span>
            팬이 만든 비공식 프로젝트입니다. KiiiKiii와 소속사와는 무관합니다.
          </span>
          <Link href="/" className="ml-auto font-semibold hover:text-ink">
            대시보드 →
          </Link>
        </div>
      </footer>
    </main>
  );
}
