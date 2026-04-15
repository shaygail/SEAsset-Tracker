"use client";

type SignOutButtonProps = {
  variant?: "drawer" | "header";
};

export default function SignOutButton({ variant = "drawer" }: SignOutButtonProps) {
  const isHeader = variant === "header";
  return (
    <form method="post" action="/api/auth/signout" className={isHeader ? "inline" : "block w-full"}>
      <button
        type="submit"
        className={
          isHeader
            ? "text-sm font-medium text-blue-100 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors border border-transparent hover:border-white/20"
            : "w-full text-left px-4 py-3 rounded-lg text-lg text-red-700 hover:bg-red-50 font-medium mt-2"
        }
      >
        Sign out
      </button>
    </form>
  );
}
