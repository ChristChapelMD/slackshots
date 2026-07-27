"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Link } from "@heroui/link";

const navigation = [
  {
    title: "Getting Started",
    links: [
      { title: "Introduction", href: "/docs" },
      { title: "Installation", href: "/docs/getting-started/installation" },
      { title: "Configuration", href: "/docs/getting-started/configuration" },
    ],
  },
  {
    title: "API Reference",
    links: [
      { title: "Authentication", href: "/docs/api/authentication" },
      { title: "Files", href: "/docs/api/files" },
      { title: "Slack Workspace", href: "/docs/api/workspaces" },
    ],
  },
  {
    title: "Guides",
    links: [
      {
        title: "Connecting to Slack",
        href: "/docs/guides/connecting-to-slack",
      },
      { title: "Uploading Files", href: "/docs/guides/uploading-files" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 p-8">
      <nav className="space-y-8">
        {navigation.map((section) => (
          <div key={section.title}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {section.title}
            </h3>
            <div className="mt-2 space-y-1">
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  as={NextLink}
                  className={`block rounded-md p-2 text-sm ${pathname === link.href ? "bg-gray-100 dark:bg-gray-800" : ""}`}
                  href={link.href}
                >
                  {link.title}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
