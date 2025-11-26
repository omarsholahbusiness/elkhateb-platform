import Image from "next/image";

export const Logo = () => {
    return (
        <Image
            height={63}
            width={60}
            alt="logo"
            src="/logo.png"
            unoptimized
        />
    )
}