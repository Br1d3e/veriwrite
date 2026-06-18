import replayerHeroImg from "./assets/replayer-example.png";
import replayerOverviewImg from "./assets/replayer-overview.png";
// import integrityVerifiedImg from "./assets/integrity-verified.png";
// import integrityNeedsReviewImg from "./assets/integrity-needs-review.png";
import demoVid from "./assets/demo.mp4";

const integrityItems = [
  {
    status: "Continuous",
    title: "Chain continuity",
    text: "Sessions and blocks stay linked in order, making missing or reordered work easier to review.",
    className: "bg-green-50 text-green-700",
  },
  {
    status: "Fresh or delayed",
    title: "Freshness status",
    text: "Live and delayed uploads are separated, so network timing can be reviewed in context.",
    className: "bg-amber-50 text-amber-700",
  },
  {
    status: "Receipts",
    title: "Signed evidence",
    text: "Server receipts and stored records help reviewers inspect the process behind the work.",
    className: "bg-blue-50 text-blue-700",
  },
];

function MediaFrame({
  src,
  alt,
  caption,
  label,
  type = "image",
  className = "",
  mediaClassName = "",
}) {
  return (
    <figure
      className={`group relative m-0 overflow-hidden rounded-[28px] border border-slate-900/10 bg-white p-2 shadow-[0_28px_90px_rgba(15,23,42,0.12)] ${className}`}
    >
      {label ? (
        <span className="absolute left-6 top-6 z-10 rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.10)] backdrop-blur">
          {label}
        </span>
      ) : null}

      {type === "video" ? (
        <video
          className={`block w-full rounded-[20px] bg-slate-50 ${mediaClassName}`}
          aria-label={alt}
          autoPlay
          loop
          muted
          playsInline
        >
          <source src={src} type="video/mp4" />
          Your browser does not support the video
        </video>
      ) : (
        <img
          className={`block w-full rounded-[20px] bg-slate-50 ${mediaClassName}`}
          src={src}
          alt={alt}
        />
      )}

      {caption ? (
        <figcaption className="px-3.5 pb-2.5 pt-3 text-sm leading-5 text-slate-500">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function SectionHeading({ title, text }) {
  return (
    <div className="mx-auto mb-9 max-w-3xl text-center">
      <h2 className="m-0 text-[clamp(2.25rem,4vw,4rem)] font-[680] leading-[1.02] tracking-[-0.055em] text-[#050816]">
        {title}
      </h2>
      {text ? (
        <p className="mx-auto mt-5 max-w-2xl text-[1.05rem] leading-8 text-slate-600">
          {text}
        </p>
      ) : null}
    </div>
  );
}

function App() {
  return (
    <main className="min-h-screen bg-[#F7F8FB] text-[#050816]">
      <header
        className="sticky top-0 z-50 border-b border-slate-900/10 bg-[#F7F8FB]/85 backdrop-blur-[18px]"
        aria-label="VeriWrite"
      >
        <div className="mx-auto flex h-18 w-[min(1220px,calc(100%-64px))] items-center justify-between gap-6 max-[700px]:w-[calc(100%-40px)]">
          <a
            className="text-lg font-bold tracking-[-0.02em] text-[#050816] no-underline"
            href="/"
          >
            VeriWrite
          </a>
          <nav
            className="flex items-center gap-6 text-[0.92rem] font-medium max-[560px]:gap-3"
            aria-label="Primary navigation"
          >
            <a
              className="text-slate-500 no-underline hover:text-[#050816] max-[520px]:hidden"
              href="#about"
            >
              About
            </a>
            <a
              className="text-slate-500 no-underline hover:text-[#050816] max-[520px]:hidden"
              href="#examples"
            >
              Examples
            </a>
            <a
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#2563EB] px-5 text-[0.95rem] font-semibold text-white no-underline shadow-[0_12px_28px_rgba(37,99,235,0.24)] hover:-translate-y-0.5 hover:bg-[#1D4ED8]"
              href="/replayer"
            >
              Open replayer
            </a>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-170px)] w-[min(1800px,calc(100%-80px))] grid-cols-[minmax(0,0.95fr)_minmax(460px,1.05fr)] items-center gap-12 py-12 max-[980px]:min-h-0 max-[980px]:w-[calc(100%-40px)] max-[980px]:grid-cols-1 max-[980px]:pb-16 max-[980px]:pt-10">
        <div className="grid gap-7 ml-30">
          <h1 className="m-0 max-w-none text-[clamp(2.8rem,4vw,6.2rem)] font-bold leading-[0.95] tracking-[-0.065em] text-[#050816] max-[640px]:text-[clamp(2.8rem,13vw,4rem)]">
            <span className="block whitespace-nowrap max-[640px]:whitespace-normal">
              Transparent writing.
            </span>
            <span className="block whitespace-nowrap max-[640px]:whitespace-normal">
              Fairer review.
            </span>
          </h1>
          <p className="m-0 max-w-none whitespace-nowrap text-[1.1rem] leading-8 text-slate-600 max-[900px]:whitespace-normal max-[640px]:text-lg max-[640px]:leading-8">
            A flight recorder for student writing, built for fair academic
            review.
          </p>
          <div className="flex flex-wrap items-center gap-3 max-[520px]:items-stretch">
            <a
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#2563EB] px-6 text-[0.95rem] font-semibold text-white no-underline shadow-[0_12px_28px_rgba(37,99,235,0.24)] hover:-translate-y-0.5 hover:bg-[#1D4ED8] max-[520px]:w-full"
              href="/replayer"
            >
              Open replayer
            </a>
            <a
              className="inline-flex h-12 items-center justify-center rounded-xl border border-[#DCE3EE] bg-white px-6 text-[0.95rem] font-semibold text-slate-700 no-underline hover:-translate-y-0.5 hover:border-slate-300 hover:text-[#050816] max-[520px]:w-full"
              href="#examples"
            >
              View examples
            </a>
          </div>
        </div>

        <MediaFrame
          src={replayerHeroImg}
          alt="VeriWrite replayer dashboard with document playback, timeline controls, analysis panels, and integrity status."
          caption="Teacher-side replay with timeline controls, document playback, and analysis in one view."
          mediaClassName="aspect-[16/10] object-cover object-[50%_16%]"
        />
      </section>

      <section
        id="about"
        className="mx-auto grid w-[min(1560px,calc(100%-64px))] grid-cols-[minmax(0,0.7fr)_minmax(520px,1.6fr)] items-center gap-30 px-30 py-28 max-[1100px]:w-[calc(100%-40px)] max-[1100px]:grid-cols-1 max-[1100px]:py-20"
      >
        <article className="max-w-sm">
          <h2 className="mb-5 text-[clamp(2.2rem,3.4vw,3.6rem)] font-[680] leading-[1.02] tracking-[-0.055em]">
            What it is
          </h2>
          <p className="m-0 text-[1.08rem] leading-8 text-slate-600">
            A student-facing tool for preserving writing-process evidence. It is
            not an AI detector and does not judge originality by itself.
          </p>
          <h2 className="mb-3 mt-18 text-[clamp(2.2rem,3.4vw,3.6rem)] font-[680] leading-[1.02] tracking-[-0.055em]">
            How it works
          </h2>
          <p className="m-0 text-[1.08rem] leading-8 text-slate-600">
            VeriWrite records writing in Microsoft Word, then lets teachers
            replay sessions, inspect progress, and review integrity signals
            before making a judgment.
          </p>
        </article>
        <figure className="m-0">
          <video
            className="block aspect-video w-full rounded-[28px] bg-white object-cover shadow-[0_28px_90px_rgba(15,23,42,0.16)]"
            aria-label="VeriWrite usage and workflow: student-side recorder and teacher-side replayer dashboard."
            autoPlay
            loop
            muted
            playsInline
          >
            <source src={demoVid} type="video/mp4" />
            Your browser does not support the video.
          </video>
        </figure>
      </section>

      <section className="bg-[#F2F5FA] py-24 max-[860px]:py-18">
        <div className="mx-auto w-[min(1220px,calc(100%-64px))] max-[860px]:w-[calc(100%-40px)]">
          <SectionHeading
            title="Evidence, not a detector."
            text="VeriWrite shows the process. Teachers make the judgment."
          />
          <div className="grid grid-cols-3 gap-5 max-[900px]:grid-cols-1">
            {integrityItems.map((item) => (
              <article
                className="rounded-[22px] border border-slate-900/10 bg-white p-7 shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition-transform duration-200 hover:-translate-y-0.5"
                key={item.title}
              >
                <span
                  className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${item.className}`}
                >
                  {item.status}
                </span>
                <h3 className="mb-3 mt-5 text-[1.35rem] font-semibold leading-tight tracking-[-0.025em] text-[#050816]">
                  {item.title}
                </h3>
                <p className="m-0 text-[0.98rem] leading-7 text-slate-600">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="examples"
        className="mx-auto w-[min(1220px,calc(100%-64px))] py-24 max-[860px]:w-[calc(100%-40px)] max-[860px]:py-18"
      >
        <SectionHeading
          title="Review the work as it formed."
          text="Replay the writing, inspect session statistics, and compare integrity states without reading a technical report."
        />

        <div className="grid gap-5">
          <MediaFrame
            src={replayerOverviewImg}
            alt="VeriWrite replayer overview showing document playback, timeline, and analysis panels."
            // caption="A full replayer view for reviewing text formation, session movement, and analysis."
            label="Replay overview"
            mediaClassName="aspect-[16/10] object-cover object-[50%_12%]"
          />

          {/* <div className="grid grid-cols-2 gap-5 max-[780px]:grid-cols-1">
            <MediaFrame
              src={integrityVerifiedImg}
              alt="VeriWrite integrity panel showing verified session and block integrity."
              caption="Signed and server-backed records can be presented as verified evidence."
              label="Valid integrity"
              imageClassName="h-[560px] object-cover object-top max-[780px]:h-auto"
            />
            <MediaFrame
              src={integrityNeedsReviewImg}
              alt="VeriWrite integrity panel showing needs-review and delayed freshness status."
              caption="Delayed or incomplete signals are separated from normal writing activity."
              label="Needs review"
              imageClassName="h-[560px] object-cover object-top max-[780px]:h-auto"
            />
          </div> */}
        </div>
      </section>

      <section className="mx-auto w-[min(1220px,calc(100%-64px))] pb-24 max-[860px]:w-[calc(100%-40px)]">
        <div className="grid items-center gap-8 p-9 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <h2 className="m-0 text-[clamp(2rem,3vw,3.2rem)] font-[680] leading-tight tracking-[-0.055em] text-[#050816]">
              Open the replayer and inspect a writing record.
            </h2>
            <p className="m-0 mt-4 max-w-2xl text-[1.05rem] leading-8 text-slate-600">
              Use the teacher dashboard to replay writing progress and check
              session movement.
            </p>
          </div>
          <a
            className="inline-flex h-12 items-center justify-center rounded-xl bg-[#2563EB] px-6 text-[0.95rem] font-semibold text-white no-underline shadow-[0_12px_28px_rgba(37,99,235,0.24)] hover:-translate-y-0.5 hover:bg-[#1D4ED8]"
            href="/replayer"
          >
            Open replayer
          </a>
        </div>
      </section>
    </main>
  );
}

export default App;
