export default function DeadlineSkeleton() {
  return (
    <div className="flex gap-5 bg-white border border-[#e6e4df] rounded-[14px] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.01)] animate-pulse">
      {/* Left box skeleton */}
      <div className="w-[68px] h-[68px] rounded-[10px] bg-[#f1f1ef] border border-[#e6e4df] flex-shrink-0 max-sm:w-[52px] max-sm:h-[52px]"></div>

      {/* Right details skeleton */}
      <div className="flex-1 space-y-3.5 py-0.5">
        <div className="flex items-center justify-between gap-4">
          {/* Title line */}
          <div className="h-4.5 bg-[#f1f1ef] rounded w-2/5 max-sm:w-1/2"></div>
          {/* Badge line */}
          <div className="h-5 bg-[#f1f1ef] rounded-full w-16"></div>
        </div>
        
        {/* Consequence line */}
        <div className="h-3.5 bg-[#f1f1ef] rounded w-3/4"></div>

        {/* Buttons skeleton */}
        <div className="flex gap-2 pt-1">
          <div className="h-9 bg-[#f1f1ef]/80 border border-[#e6e4df] rounded-lg w-28 max-sm:flex-1"></div>
          <div className="h-9 bg-[#f1f1ef]/80 border border-[#e6e4df] rounded-lg w-32 max-sm:flex-1"></div>
        </div>
      </div>
    </div>
  )
}
