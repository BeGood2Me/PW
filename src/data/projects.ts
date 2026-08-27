export type Project = {
  name: string;
  url: string;
  description: string;
  iconUrl: string;
  accent: string;
  accentText: string;
  accentRing: string;
};

export const projects: Project[] = [
  {
    name: "PickTheRobot",
    url: "https://picktherobot.com",
    description:
      "Pick the right robot for your business in under two minutes.",
    iconUrl: "https://picktherobot.com/favicon.ico",
    accent: "from-orange-400 to-amber-500",
    accentText: "text-orange-600",
    accentRing: "hover:ring-orange-300",
  },
  {
    name: "RobotJobsBoard",
    url: "https://robotjobsboard.com",
    description:
      "Browse robotics and automation jobs from companies building the future.",
    iconUrl: "/icons/robotjobsboard.svg",
    accent: "from-emerald-400 to-teal-500",
    accentText: "text-emerald-600",
    accentRing: "hover:ring-emerald-300",
  },
  {
    name: "Ad Breakeven",
    url: "https://adbreakeven.com",
    description:
      "Find your minimum ROAS, CPA, and CPC for ecommerce and lead gen.",
    iconUrl: "https://adbreakeven.com/icon.svg",
    accent: "from-sky-400 to-blue-500",
    accentText: "text-blue-600",
    accentRing: "hover:ring-blue-300",
  },
  {
    name: "Revenue Leak",
    url: "https://revenueleak.report",
    description:
      "Find where your business is leaking revenue in five minutes.",
    iconUrl: "https://revenueleak.report/icon.svg",
    accent: "from-violet-400 to-purple-500",
    accentText: "text-violet-600",
    accentRing: "hover:ring-violet-300",
  },
];
