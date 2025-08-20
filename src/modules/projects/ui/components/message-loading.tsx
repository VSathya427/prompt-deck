import Image from "next/image";
import { useState, useEffect } from "react";

const ShimmerMessages = () => {
    const messages = [
        "Warming up the stage lights...",
        "Zooming into the slide universe...",
        "Plotting paths through 3D space...",
        "Spinning up dramatic transitions...",
        "Calculating the wow factor...",
        "Aligning cosmic slide orbits...",
        "Prepping camera angles...",
        "Charging the creativity lasers...",
        "Summoning intergalactic fonts...",
        "Building a wormhole to your ideas...",
        "Stretching slides across dimensions...",
        "Energizing infinite zoom...",
        "Polishing the cinematic flair...",
        "Stabilizing rotation sequence...",
        "Injecting a dose of spectacle...",
        "Hyper-jumping to presentation mode...",
        "Loading drama.exe...",
        "Animating brilliance frame by frame...",
        "Almost there—cue the spotlight!"
    ];

    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

    useEffect(()=>{
        const interval = setInterval(() => {
            setCurrentMessageIndex((prev)=>(prev+1)%messages.length);
        }, 3000);
        return () => clearInterval(interval);
    },[messages.length]);

    return (
        <div className="flex items-center gap-2">
            <span className="text-base text-muted-foreground animate-pulse">
                {messages[currentMessageIndex]}
            </span>
        </div>
    );
}

export const MessageLoading = () =>{
    return (
        <div className="flex flex-col group px-2 pb-4">
            <div className="flex items-center gap-2 pl-2 mb-2">
                <Image
                    src="/logo.svg"
                    alt="prompt-deck"
                    width={22}
                    height={15}
                    className="shrink-0"
                />
                <span className="text-sm font-medium">PromptDeck</span>
            </div>
            <div className="pl-9.5 flex flex-col gap-y-4">
                <ShimmerMessages />
            </div>
        </div>
    );
};