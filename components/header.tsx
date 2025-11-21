import Link from 'next/link';

// Simple Tailwind CSS classes for a clean, responsive navigation
const Header = () => {
  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
    // Add more pages as you create them
  ];

  return (
    <header className="bg-gray-900 text-white shadow-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Site Title */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-extrabold tracking-wider hover:text-indigo-400 transition-colors">
              Cyber-Node
            </Link>
          </div>
          
          {/* Navigation Links */}
          <nav className="flex space-x-2 md:space-x-4">
            {navItems.map((item) => (
              <Link 
                key={item.name} 
                href={item.href} 
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-indigo-600 hover:text-white bg-gray-800 text-gray-200"
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;