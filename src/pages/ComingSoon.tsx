import { TabBar } from '../components/TabBar'

/** Tabs that aren't part of the calling MVP yet. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col">
      <main className="pt-safe flex flex-1 flex-col gap-4 px-5">
        <h1 className="m-0 pt-4 text-[30px] font-extrabold tracking-tight">{title}</h1>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <h2 className="m-0 text-xl font-extrabold">Not in this build</h2>
          <p className="m-0 max-w-72 text-[15px] leading-normal text-muted">
            This version is for testing calls with Lucía. {title} comes next.
          </p>
        </div>
      </main>
      <TabBar />
    </div>
  )
}
