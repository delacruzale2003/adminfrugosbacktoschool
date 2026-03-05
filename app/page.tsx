import { redirect } from "next/navigation";

export default function Home() {
  // Redirige automáticamente a la ruta /share
  redirect("/share");
}