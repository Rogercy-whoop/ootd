import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy',
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-2xl space-y-6 pb-10">
      <h1 className="font-headline text-4xl font-bold tracking-tight">Privacy</h1>
      <p className="text-foreground/80">
        OOTD is a student project. This page says plainly what happens to the photos and
        information you put into it.
      </p>

      <section className="space-y-2">
        <h2 className="font-headline text-2xl font-semibold">What is stored, and where</h2>
        <p>
          There are no accounts. Your closet photos, their tags, the outfits you save and a count of
          the free photo analyses you have used are kept only in this browser on this device (the
          browser&apos;s local storage). We do not keep a
          copy on a server or in a database. They stay until you delete them.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-headline text-2xl font-semibold">What is sent to the AI</h2>
        <p>
          When you add an item, its photo is sent to Google&apos;s Gemini API so the AI can describe
          it (category, colours, tags). When you ask for an outfit, the text descriptions of your
          items (not the photos), the occasion you typed and the local weather are sent to Gemini.
          This app uses Gemini&apos;s free tier, and under Google&apos;s terms Google may use content
          sent on the free tier to improve its products. Please photograph the clothes only, not
          yourself or other people.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-headline text-2xl font-semibold">Location</h2>
        <p>
          If you allow location access, your browser&apos;s coordinates (or the city you type) are used
          to look up the current weather from Open-Meteo, a free weather service. They are not
          stored.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-headline text-2xl font-semibold">Deleting your data</h2>
        <p>
          Remove items on the My Closet page and outfits on the Inspiration page, or clear this
          site&apos;s data in your browser settings. That deletes everything the app has kept.
        </p>
      </section>
    </div>
  );
}
