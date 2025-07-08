import Image from "next/image"; // Keep if we add icons to buttons, otherwise remove

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brandBlack p-8">
      <div className="flex flex-col items-center gap-6">
        {/* Logo ou Título (Opcional) */}
        {/* <h1 className="text-5xl font-bold text-brandPurple mb-12">
          NomeDoServiço
        </h1> */}

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            className="px-8 py-3 bg-brandPurple text-white text-lg font-semibold rounded-lg shadow-md hover:bg-brandPurpleDark transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-brandPurple focus:ring-opacity-50"
          >
            Faça Login
          </button>
          <button
            type="button"
            className="px-8 py-3 bg-brandPurple text-white text-lg font-semibold rounded-lg shadow-md hover:bg-brandPurpleDark transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-brandPurple focus:ring-opacity-50"
          >
            Cadastre-se (conta do Discord)
          </button>
        </div>
      </div>
    </main>
  );
}
