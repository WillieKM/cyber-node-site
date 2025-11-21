// Simple, fixed footer component
const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white border-t border-gray-700 mt-16 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-sm text-gray-400">
            &copy; {currentYear} **Cyber-Node**. All rights reserved.
          </p>
          <div className="flex space-x-6">
            {/* Placeholder for social media or legal links */}
            <Link href="/privacy" className="text-sm text-gray-400 hover:text-indigo-400 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-sm text-gray-400 hover:text-indigo-400 transition-colors">Terms of Service</Link>
            <a href="https://github.com/your-repo" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-indigo-400 transition-colors">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;