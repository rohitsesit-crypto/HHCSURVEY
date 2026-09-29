import SurveyForm from "@/components/SurveyForm";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          Survey Form
        </span>
        
      </header>

      <SurveyForm />

      <footer className="mt-10 text-center text-xs text-slate-400">
        Fields marked <span className="text-rose-500">*</span> are required.
      </footer>
    </main>
  );
}
