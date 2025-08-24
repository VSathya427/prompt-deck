import { Navbar } from "@/modules/home/ui/components/navbar"


interface Props {
    children: React.ReactNode;
};


const Layout1 = ({ children }: Props) => {
    return (
        <main className="flex flex-col min-h-screen max-h-screen">
            <div className="absolute inset-0 -z-10 h-full w-full bg-background 
                dark:bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.08)_0%,transparent_60%),radial-gradient(ellipse_at_80%_20%,rgba(45,38,33,0.12)_0%,transparent_50%),radial-gradient(#2d2621_1px,transparent_1px)]
                bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.06)_0%,transparent_70%),radial-gradient(ellipse_at_80%_20%,rgba(255,194,77,0.06)_0%,transparent_50%),radial-gradient(#e5e7eb_1px,transparent_1px)] 
                [background-size:auto,auto,16px_16px]"/>
            <div className="flex-1 flex flex-col px-4 pb-4">
                {children}
            </div>
        </main>
    );
};

// Option 6: Organic Waves (Modern & Elegant)
const Layout2 = ({ children }: Props) => {
    return (
        <main className="flex flex-col min-h-screen max-h-screen">
            <div className="absolute inset-0 -z-10 h-full w-full bg-background 
                dark:bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.12)_0%,transparent_50%),radial-gradient(ellipse_at_80%_20%,rgba(45,38,33,0.15)_0%,transparent_50%)]
                bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.08)_0%,transparent_70%),radial-gradient(ellipse_at_80%_20%,rgba(217,119,6,0.06)_0%,transparent_60%),radial-gradient(ellipse_at_20%_80%,rgba(255,194,77,0.08)_0%,transparent_50%)]"/>
            <div className="flex-1 flex flex-col px-4 pb-4">
                {children}
            </div>
        </main>
    );
};

const Layout3 = ({ children }: Props) => {
    return (
        <main className="flex flex-col min-h-screen max-h-screen">
            <Navbar />
            <div className="absolute inset-0 -z-10 h-full w-full bg-background overflow-hidden">
                <div className="absolute inset-0 animate-pulse
                    dark:bg-[radial-gradient(ellipse_600px_400px_at_center,rgba(217,119,6,0.15)_0%,transparent_50%)]
                    bg-[radial-gradient(ellipse_600px_400px_at_center,rgba(217,119,6,0.08)_0%,transparent_50%)]"/>
                <div className="absolute inset-0 animate-bounce 
                    dark:bg-[radial-gradient(ellipse_400px_600px_at_80%_20%,rgba(255,146,51,0.12)_0%,transparent_60%)]
                    bg-[radial-gradient(ellipse_400px_600px_at_80%_20%,rgba(255,146,51,0.06)_0%,transparent_60%)]"
                    style={{ animationDuration: '8s', animationDelay: '2s' }} />
                <div className="absolute inset-0
                    dark:bg-[radial-gradient(ellipse_500px_300px_at_20%_80%,rgba(251,191,36,0.1)_0%,transparent_70%)]
                    bg-[radial-gradient(ellipse_500px_300px_at_20%_80%,rgba(251,191,36,0.05)_0%,transparent_70%)]
                    animate-pulse"
                    style={{ animationDuration: '12s', animationDelay: '4s' }} />
            </div>
            <div className="flex-1 flex flex-col px-4 pb-4">
                {children}
            </div>
        </main>
    );
};


export default Layout3;
