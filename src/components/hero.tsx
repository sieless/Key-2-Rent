import Image from 'next/image'

export function Hero() {
  return (
    <div className="relative overflow-hidden border-b bg-card">
      <div className="absolute inset-0 hidden dark:block">
        <Image
          src="/backgrounds/timelaine-hero-dark.png"
          alt="Timelaine dark theme hero background"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-slate-900/70" />
      </div>
      <div className="relative text-center py-16 px-4 sm:px-6 lg:px-8 bg-card/95 dark:bg-transparent">
        <h1 className="text-4xl font-extrabold text-foreground dark:text-white sm:text-5xl md:text-6xl">
          Find Your Next Home
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-xl text-muted-foreground dark:text-slate-100/80">
          The simplest way to find rental properties. Browse listings, filter by your needs, and connect with landlords instantly.
        </p>
      </div>
    </div>
  )
}
