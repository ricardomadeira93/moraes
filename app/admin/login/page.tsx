import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <form
      action={async (formData) => {
        "use server";
        await signIn("credentials", {
          email: formData.get("email"),
          password: formData.get("password"),
          redirectTo: "/admin"
        });
      }}
      className="mx-auto mt-24 max-w-md space-y-4 rounded bg-white p-6 shadow"
    >
      <h1 className="text-2xl font-semibold">Admin Login</h1>
      <input className="w-full rounded border p-2" type="email" name="email" placeholder="email" required />
      <input className="w-full rounded border p-2" type="password" name="password" placeholder="password" required />
      <button className="w-full rounded bg-primary p-2 text-white" type="submit">Entrar</button>
    </form>
  );
}
