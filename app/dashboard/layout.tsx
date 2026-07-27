import "@/styles/globals.css";

import { Header } from "@/components/dashboard/header/header";
import { Toolbar } from "@/components/dashboard/toolbar/toolbar";
import { TextureContainer } from "@/components/ui/texture-container";
import { DashboardProviders } from "@/components/dashboard/dashboard-providers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProviders>
      <div className="max-h-fit inset-0 flex items-center justify-center p-4">
        <TextureContainer className="w-[95vw] h-[95vh] flex flex-col overflow-hidden">
          <Header />
          <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
            <div className="w-full md:w-[350px] order-last md:order-first overflow-hidden bg-transparent">
              <Toolbar />
            </div>
            {children}
          </div>
        </TextureContainer>
      </div>
    </DashboardProviders>
  );
}
