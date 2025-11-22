"use client";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Cyber-Node</h1>
      <p className="text-lg text-gray-600 max-w-xl text-center">
        Welcome to Cyber-Node — your digital infrastructure, automation, and web solutions partner.
      </p>

      <div className="mt-8 flex gap-4">
        <a
          href="/contact"
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Contact Us
        </a>
        <a
          href="/services"
          className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
        >
          Our Services
        </a>
      </div>
    </main>
  );
}
