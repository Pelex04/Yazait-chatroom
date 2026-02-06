import { Wrench, Calendar, ArrowRight } from 'lucide-react';

const MaintenancePage = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CX</span>
            </div>
            <span className="text-lg font-semibold text-gray-900 tracking-tight">
              ChezaX
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-200">
              <Wrench className="w-10 h-10 text-gray-900" strokeWidth={1.5} />
            </div>
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-sm font-medium text-amber-900">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
            Scheduled Maintenance
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
              We're making ChezaX better
            </h1>
            <p className="text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
              We're currently performing scheduled maintenance to improve your experience. 
              We'll be back online shortly.
            </p>
          </div>

          {/* Timeline */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-700">
              <Calendar className="w-4 h-4" />
              Expected completion
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-gray-900">
                February 9, 2026
              </div>
              <div className="text-sm text-gray-600">
                We apologize for any inconvenience
              </div>
            </div>
          </div>

          {/* What's Happening */}
          <div className="text-left bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              What we're working on
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <span className="text-gray-700">Enhanced performance and reliability</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <span className="text-gray-700">New features and improvements</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <span className="text-gray-700">Security updates and optimizations</span>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="pt-4">
            <p className="text-sm text-gray-500">
              Need help?{' '}
              <a 
                href="mailto:rastakadema@gmail.com" 
                className="text-gray-900 font-medium hover:underline"
              >
                Contact our support team
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <p className="text-center text-xs text-gray-500">
            Powered by <span className="font-medium text-gray-700">Rasta Kadema</span>
          </p>
        </div>
      </div>

      {/* Subtle Animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .max-w-2xl > * {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
        }
        
        .max-w-2xl > *:nth-child(1) { animation-delay: 0.1s; }
        .max-w-2xl > *:nth-child(2) { animation-delay: 0.2s; }
        .max-w-2xl > *:nth-child(3) { animation-delay: 0.3s; }
        .max-w-2xl > *:nth-child(4) { animation-delay: 0.4s; }
        .max-w-2xl > *:nth-child(5) { animation-delay: 0.5s; }
        .max-w-2xl > *:nth-child(6) { animation-delay: 0.6s; }
      `}</style>
    </div>
  );
};

export default MaintenancePage;