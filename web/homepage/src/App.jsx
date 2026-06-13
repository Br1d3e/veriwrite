import replayerHeroImg from "./assets/replayer-example.png";
import replayerOverviewImg from "./assets/replayer-overview.png";
import integrityVerifiedImg from "./assets/integrity-verified.png";
import integrityNeedsReviewImg from "./assets/integrity-needs-review.png";

const integrityItems = [
  {
    title: "Chain continuity",
    text: "Recorded blocks stay linked in order so missing or reordered parts can be reviewed.",
  },
  {
    title: "Freshness status",
    text: "Live and delayed uploads are shown differently when network timing affects confidence.",
  },
  {
    title: "Receipts",
    text: "Server-verified sessions and blocks can be shown as signed evidence in the replayer.",
  },
];

function App() {
  return (
    <main className="mx-auto w-[min(1120px,calc(100%-40px))] pb-16 pt-5 text-slate-950 max-[860px]:w-[min(680px,calc(100%-28px))]">
      <header
        className="flex items-center justify-between gap-6 border-b border-slate-200 pb-7 max-[640px]:items-start max-[640px]:flex-col max-[640px]:gap-3"
        aria-label="VeriWrite"
      >
        <a className="text-lg font-bold text-slate-950 no-underline" href="/">
          VeriWrite
        </a>
        <nav
          className="flex items-center gap-4 text-[0.94rem] max-[640px]:w-full max-[640px]:flex-wrap"
          aria-label="Primary navigation"
        >
          <a
            className="text-slate-500 no-underline hover:text-slate-950"
            href="#about"
          >
            About
          </a>
          <a
            className="text-slate-500 no-underline hover:text-slate-950"
            href="#examples"
          >
            Examples
          </a>
          <a
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white no-underline shadow-sm shadow-blue-950/10 hover:bg-blue-700 max-[640px]:ml-auto"
            href="/replayer"
          >
            Replayer
          </a>
        </nav>
      </header>

      <section className="grid grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)] items-center gap-11 border-b border-slate-200 py-16 max-[860px]:grid-cols-1 max-[860px]:gap-8 max-[860px]:py-11">
        <div className="grid gap-6">
          <h1 className="m-0 max-w-3xl text-[clamp(2.45rem,5vw,4.7rem)] font-semibold leading-[0.98] tracking-normal text-slate-950 max-[860px]:text-[clamp(2.35rem,12vw,3.25rem)] max-[860px]:leading-[1.04]">
            <strong>VeriWrite</strong>
            <br />A tool that evidences writing integrity.
          </h1>
          <p className="m-0 max-w-2xl text-lg leading-8 text-slate-600">
            Students record their writing in Microsoft Word. Teachers open the
            record in a replayer to review writing progress and detailed
            statistics before making a judgment.
          </p>
          <div className="flex flex-wrap items-center gap-3 max-[520px]:flex-col max-[520px]:items-stretch">
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-5 text-[0.95rem] font-semibold text-white no-underline shadow-lg shadow-blue-900/15 hover:bg-blue-700"
              href="/replayer"
            >
              Open replayer
            </a>
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-[0.95rem] font-semibold text-slate-600 no-underline hover:text-slate-950"
              href="#examples"
            >
              View examples
            </a>
          </div>
        </div>

        <figure className="m-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.10)]">
          <img
            className="block aspect-video w-full object-cover object-[50%_18%]"
            src={replayerHeroImg}
            alt="VeriWrite replayer dashboard with writing playback, session analysis, and replay controls."
          />
          <figcaption className="border-t border-slate-200 px-3.5 py-3 text-sm leading-5 text-slate-500">
            Teacher-side replay and writing analysis
          </figcaption>
        </figure>
      </section>

      <section
        id="about"
        className="grid grid-cols-2 gap-11 border-b border-slate-200 py-14 max-[860px]:grid-cols-1 max-[860px]:py-11"
      >
        <div>
          <h2 className="mb-3 mt-0 text-[clamp(1.45rem,2.4vw,2rem)] leading-tight tracking-normal text-slate-950">
            What it is
          </h2>
          <p className="m-0 leading-7 text-slate-600">
            VeriWrite is a student-facing tool that provides evidence for
            academic integrity in formal writing. It is not an AI detector and
            does not decide originality by itself.
          </p>
        </div>
        <div>
          <h2 className="mb-3 mt-0 text-[clamp(1.45rem,2.4vw,2rem)] leading-tight tracking-normal text-slate-950">
            How it works
          </h2>
          <p className="m-0 leading-7 text-slate-600">
            The Microsoft Word add-in records document-change events during
            writing, then the replayer lets teachers view the student&apos;s
            progress of work alongside review signals and integrity status.
          </p>
        </div>
      </section>

      <section
        className="border-b border-slate-200 py-14 max-[860px]:py-11"
        aria-labelledby="integrity"
      >
        <div className="mb-7 max-w-3xl">
          <h2
            id="integrity"
            className="mb-3 mt-0 text-[clamp(1.45rem,2.4vw,2rem)] leading-tight tracking-normal text-slate-950"
          >
            Integrity signals without the deep technical layer
          </h2>
          <p className="m-0 leading-7 text-slate-600">
            The replayer can surface whether the record stayed continuous,
            whether uploads were fresh or delayed, and whether verification
            receipts are available.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 max-[860px]:grid-cols-1">
          {integrityItems.map((item) => (
            <article
              className="rounded-lg border border-slate-200 bg-white p-5"
              key={item.title}
            >
              <h3 className="mb-2 mt-0 text-base text-slate-950">
                {item.title}
              </h3>
              <p className="m-0 text-[0.95rem] leading-7 text-slate-600">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="examples" className="py-14 max-[860px]:py-11">
        <div className="mb-7 max-w-3xl">
          <h2 className="mb-3 mt-0 text-[clamp(1.45rem,2.4vw,2rem)] leading-tight tracking-normal text-slate-950">
            Examples
          </h2>
          <p className="m-0 leading-7 text-slate-600">
            A small look at the teacher replayer and integrity states.
          </p>
        </div>

        <div className="grid gap-4">
          <figure className="m-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <img
              className="block w-full bg-slate-50"
              src={replayerOverviewImg}
              alt="VeriWrite replayer overview showing document playback, timeline, and analysis panels."
            />
            <figcaption className="border-t border-slate-200 px-3.5 py-3 text-sm leading-5 text-slate-500">
              Replayer overview
            </figcaption>
          </figure>

          <div className="grid grid-cols-2 gap-4 max-[760px]:grid-cols-1">
            <figure className="m-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <img
                className="block h-[600px] w-full bg-slate-50 object-cover object-top max-[760px]:h-auto"
                src={integrityVerifiedImg}
                alt="VeriWrite integrity panel showing verified session and block integrity."
              />
              <figcaption className="border-t border-slate-200 px-3.5 py-3 text-sm leading-5 text-slate-500">
                Verified integrity
              </figcaption>
            </figure>

            <figure className="m-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <img
                className="block h-[600px] w-full bg-slate-50 object-cover object-top max-[760px]:h-auto"
                src={integrityNeedsReviewImg}
                alt="VeriWrite integrity panel showing needs-review and delayed freshness status."
              />
              <figcaption className="border-t border-slate-200 px-3.5 py-3 text-sm leading-5 text-slate-500">
                Needs-review integrity
              </figcaption>
            </figure>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
