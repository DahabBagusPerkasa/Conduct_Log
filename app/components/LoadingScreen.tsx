"use client";

type LoadingScreenProps = {
  message?: string;
  fullPage?: boolean;
};

export default function LoadingScreen({
  message = "Loading...",
  fullPage = false,
}: LoadingScreenProps) {
  return (
    <div className={fullPage ? "loading-screen-fullpage" : "loading-screen-inline"}>
      <div className="loading-card">
        <div className="loading-spinner" />
        <p>{message}</p>
      </div>
    </div>
  );
}
