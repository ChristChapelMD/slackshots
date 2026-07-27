"use client";

export function MediaPlayer() {
  return (
    <div className="w-full overflow-hidden rounded-xl dark:border-gray-700 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="aspect-[16/9] h-auto w-full object-cover"
        height={1000}
        width={1000}
      >
        <source src="/ss-placeholder-clip.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
