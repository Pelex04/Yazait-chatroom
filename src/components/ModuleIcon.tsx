
import { 
  Code, 
  Database, 
  Cpu, 
  Network, 
  Globe, 
  BookOpen,
  Calculator,
  Lightbulb,
  Atom,
  GitBranch,
  Server,
  Smartphone,
  Cloud,
  Lock,
  Zap,
  FileCode,
  Layout,
  Braces
} from 'lucide-react';

interface ModuleIconProps {
  moduleName: string;
  moduleCode?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const ModuleIcon = ({ 
  moduleName, 
  moduleCode, 
  size = 'md',
  className = '' 
}: ModuleIconProps) => {
  
  // Size mappings
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32
  };

  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];

  // Determine icon and colors based on module name/code
  const getModuleStyle = () => {
    const searchText = `${moduleName} ${moduleCode}`.toLowerCase();

    // Programming & Software
    if (searchText.match(/programming|coding|software|java|python|c\+\+|javascript/)) {
      return {
        icon: <Code size={iconSize} />,
        gradient: 'from-blue-400 to-blue-600',
        ringColor: 'ring-blue-200'
      };
    }

    // Data Structures & Algorithms
    if (searchText.match(/data structures?|algorithm|ds|dsa/)) {
      return {
        icon: <GitBranch size={iconSize} />,
        gradient: 'from-purple-400 to-purple-600',
        ringColor: 'ring-purple-200'
      };
    }

    // Database
    if (searchText.match(/database|sql|mysql|mongodb|db/)) {
      return {
        icon: <Database size={iconSize} />,
        gradient: 'from-green-400 to-green-600',
        ringColor: 'ring-green-200'
      };
    }

    // Networking & Internet
    if (searchText.match(/network|internet|tcp|ip|routing|cisco/)) {
      return {
        icon: <Network size={iconSize} />,
        gradient: 'from-cyan-400 to-cyan-600',
        ringColor: 'ring-cyan-200'
      };
    }

    // Web Development
    if (searchText.match(/web|html|css|react|frontend|backend/)) {
      return {
        icon: <Globe size={iconSize} />,
        gradient: 'from-orange-400 to-orange-600',
        ringColor: 'ring-orange-200'
      };
    }

    // Computer Architecture & Hardware
    if (searchText.match(/computer architecture|hardware|cpu|assembly|microprocessor/)) {
      return {
        icon: <Cpu size={iconSize} />,
        gradient: 'from-red-400 to-red-600',
        ringColor: 'ring-red-200'
      };
    }

    // AI & Machine Learning
    if (searchText.match(/ai|artificial intelligence|machine learning|ml|neural/)) {
      return {
        icon: <Lightbulb size={iconSize} />,
        gradient: 'from-yellow-400 to-yellow-600',
        ringColor: 'ring-yellow-200'
      };
    }

    // Mathematics & Statistics
    if (searchText.match(/math|calculus|statistics|algebra|discrete/)) {
      return {
        icon: <Calculator size={iconSize} />,
        gradient: 'from-indigo-400 to-indigo-600',
        ringColor: 'ring-indigo-200'
      };
    }

    // Physics & Science
    if (searchText.match(/physics|chemistry|science/)) {
      return {
        icon: <Atom size={iconSize} />,
        gradient: 'from-teal-400 to-teal-600',
        ringColor: 'ring-teal-200'
      };
    }

    // Mobile Development
    if (searchText.match(/mobile|android|ios|app development/)) {
      return {
        icon: <Smartphone size={iconSize} />,
        gradient: 'from-pink-400 to-pink-600',
        ringColor: 'ring-pink-200'
      };
    }

    // Cloud Computing
    if (searchText.match(/cloud|aws|azure|gcp|devops/)) {
      return {
        icon: <Cloud size={iconSize} />,
        gradient: 'from-sky-400 to-sky-600',
        ringColor: 'ring-sky-200'
      };
    }

    // Security & Cryptography
    if (searchText.match(/security|crypto|encryption|cybersecurity/)) {
      return {
        icon: <Lock size={iconSize} />,
        gradient: 'from-slate-400 to-slate-600',
        ringColor: 'ring-slate-200'
      };
    }

    // Systems & Operating Systems
    if (searchText.match(/operating system|os|linux|unix|systems/)) {
      return {
        icon: <Server size={iconSize} />,
        gradient: 'from-emerald-400 to-emerald-600',
        ringColor: 'ring-emerald-200'
      };
    }

    // Compilers & Theory
    if (searchText.match(/compiler|automata|theory|formal languages/)) {
      return {
        icon: <Braces size={iconSize} />,
        gradient: 'from-violet-400 to-violet-600',
        ringColor: 'ring-violet-200'
      };
    }

    // UI/UX Design
    if (searchText.match(/ui|ux|design|interface|graphics/)) {
      return {
        icon: <Layout size={iconSize} />,
        gradient: 'from-rose-400 to-rose-600',
        ringColor: 'ring-rose-200'
      };
    }

    // Electronics & Circuits
    if (searchText.match(/electronic|circuit|digital logic/)) {
      return {
        icon: <Zap size={iconSize} />,
        gradient: 'from-amber-400 to-amber-600',
        ringColor: 'ring-amber-200'
      };
    }

    // Software Engineering
    if (searchText.match(/software engineering|sdlc|agile|scrum/)) {
      return {
        icon: <FileCode size={iconSize} />,
        gradient: 'from-lime-400 to-lime-600',
        ringColor: 'ring-lime-200'
      };
    }

    // Default - Generic course
    return {
      icon: <BookOpen size={iconSize} />,
      gradient: 'from-gray-400 to-gray-600',
      ringColor: 'ring-gray-200'
    };
  };

  const style = getModuleStyle();

  return (
    <div 
      className={`
        ${sizeClass} 
        bg-gradient-to-br ${style.gradient} 
        rounded-xl 
        flex items-center justify-center 
        text-white 
        shadow-md 
        ring-2 ring-white ring-opacity-50
        ${className}
      `}
      title={`${moduleCode ? moduleCode + ' - ' : ''}${moduleName}`}
    >
      {style.icon}
    </div>
  );
};

export default ModuleIcon;