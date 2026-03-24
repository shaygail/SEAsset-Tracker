"use client";
export default function SignOutButton() {
  return (
    <form method="post" action="/api/auth/signout">
      <button
        type="submit"
        className="w-full text-left px-4 py-3 rounded text-lg text-red-700 hover:bg-red-50 font-medium mt-2"
      >
        Sign out
      </button>
    </form>
  );
}
