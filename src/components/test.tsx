
import {
  Search,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  ChevronDown,
  Users,
  School,
  Settings,
  Circle,
} from "lucide-react";

export default function App() {
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left Sidebar */}
      <div className="w-80 bg-gray-800 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 bg-yellow-500 rounded flex items-center justify-center text-black font-bold text-lg">
            Y
          </div>
          <div>
            <p className="font-semibold text-sm">Yazait</p>
            <p className="text-xs text-gray-400">Learn, grow</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full bg-gray-700 rounded-full px-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none"
          />
        </div>

        {/* Navigation */}
        <nav className="px-4 space-y-2">
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 bg-yellow-500 bg-opacity-20 rounded-lg text-yellow-50"
          >
            <Users className="w-5 h-5" />
            <span className="font-medium text-sm">Groups</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg"
          >
            <School className="w-5 h-5 text-yellow-400" />
            <span className="text-sm">Teachers</span>
            <span className="ml-auto text-xs bg-yellow-400 text-black px-2 py-0.5 rounded-full">
              NEW
            </span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg"
          >
            <Settings className="w-5 h-5 text-yellow-400" />
            <span className="text-sm">Settings</span>
          </a>
        </nav>

        {/* Online Now Section */}
        <div className="px-4 mt-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <Circle className="w-3 h-3 fill-green-500 text-green-500" />
            <span>ONLINE NOW</span>
            <ChevronDown className="w-4 h-4 ml-auto" />
          </div>

          {/* Contacts List */}
          <div className="space-y-2">
            {/* Active Contact */}
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-700 rounded-lg">
              <div className="relative">
                <img
                  src="https://via.placeholder.com/40"
                  alt="Bongani Dlamini"
                  className="w-10 h-10 rounded-full"
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-700"></div>
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Bongani Dlamini</p>
                <p className="text-xs text-gray-400">Active now</p>
              </div>
            </div>

            {/* Other Contacts */}
            {[
              { name: "Nthanda Chikwawa", status: "Active now" },
              { name: "Chifundo Banda", status: "Active 2h ago" },
              { name: "Tadala Phiri", status: "Active now" },
              { name: "Mphatso Lungu", status: "Active 3h ago" },
            ].map((contact) => (
              <div
                key={contact.name}
                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg cursor-pointer"
              >
                <div className="relative">
                  <img
                    src="https://via.placeholder.com/40"
                    alt={contact.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{contact.name}</p>
                  <p className="text-xs text-gray-400">{contact.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-700 flex-shrink-0">
          <p className="text-center text-xs text-gray-400">
            Powered by{" "}
            <span className="font-semibold text-yellow-400">Rasta Kadema</span>.
            All rights reserved.
          </p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="h-16 bg-gray-950 flex items-center justify-between px-6 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src="https://via.placeholder.com/40"
                alt="Bongani Dlamini"
                className="w-10 h-10 rounded-full"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-950"></div>
            </div>
            <div>
              <h2 className="font-semibold text-sm">Bongani Dlamini</h2>
              <p className="text-xs text-green-400">Active now</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-700 rounded-lg">
              <Phone className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-gray-700 rounded-lg">
              <Video className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-gray-700 rounded-lg">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-gray-700 rounded-lg">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 bg-white overflow-y-auto p-6 text-black">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Date Header */}
            <div className="text-center text-xs text-gray-500 my-4">Today</div>

            {/* Messages */}
            <div className="space-y-4">
              {/* Received Message */}
              <div className="flex items-start gap-3">
                <img
                  src="https://via.placeholder.com/32"
                  alt="Bongani"
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    Bongani Dlamini · 10:20 AM
                  </p>
                  <div className="bg-gray-800 rounded-2xl px-4 py-3 inline-block max-w-lg text-white text-sm">
                    Good morning! Hope everyone is having a productive day.
                  </div>
                </div>
              </div>

              {/* Sent Message */}
              <div className="flex items-start gap-3 justify-end">
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-1">You · 10:27 AM</p>
                  <div className="bg-blue-600 rounded-2xl px-4 py-3 inline-block max-w-lg text-white text-sm">
                    Morning Bongani! That’s great to hear.
                  </div>
                </div>
              </div>

              {/* Add more messages as needed */}
            </div>
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4 bg-gray-950 border-t border-gray-700 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            {/* Attachment */}
            <button className="p-2 hover:bg-gray-700 rounded-lg">
              <Paperclip className="w-5 h-5 text-gray-400" />
            </button>

            {/* Microphone */}
            <button className="p-2 hover:bg-gray-700 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 1v11m0 0a3 3 0 003-3V4a3 3 0 00-6 0v5a3 3 0 003 3zm0 0v4m0 0a7 7 0 007-7h-2a5 5 0 01-10 0H5a7 7 0 007 7z"
                />
              </svg>
            </button>

            {/* Text Input */}
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 bg-white rounded-full px-5 py-3 text-sm text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Emoji */}
            <button className="p-2 hover:bg-gray-700 rounded-lg">
              <Smile className="w-5 h-5 text-gray-400" />
            </button>

            {/* Send */}
            <button className="p-3 bg-yellow-500 hover:bg-yellow-600 rounded-full">
              <Send className="w-5 h-5 text-black" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}