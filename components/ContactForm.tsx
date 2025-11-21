// This file is located in cyber-node/app/contact/page.tsx

// We use the Next.js path alias '@/components/' to reliably locate the component.
import ContactForm from '@/components/ContactForm';
import React from 'react';

export const metadata = {
  title: 'Contact Cyber-Node',
  description: 'Get in touch with the Cyber-Node team.',
};

const ContactPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-16">
      <div className="max-w-3xl w-full px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-6">
          Contact Us
        </h1>
        <p className="text-xl text-gray-600 text-center mb-10">
          We'd love to hear from you. Send us a message below.
        </p>
        
        {/* The imported ContactForm component is placed here */}
        <ContactForm />

      </div>
    </div>
  );
};

export default ContactPage;