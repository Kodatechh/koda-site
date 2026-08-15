import { Camera } from "lucide-react";

export function ProductPhotoSlot({
  label = "Foto oficial do KodaBot I",
  className = "h-[460px] sm:h-[620px]",
  dark = false,
}: {
  label?: string;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div className={`grid w-full place-items-center overflow-hidden ${className} ${dark ? "bg-black text-white" : "bg-[#f5f5f7] text-[#1d1d1f]"}`}>
      <div className="max-w-sm px-6 text-center">
        <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${dark ? "bg-white/10 text-[#5b9cff]" : "bg-white text-[#0071e3] shadow-sm"}`}>
          <Camera className="h-6 w-6" />
        </div>
        <p className="mt-5 text-lg font-semibold tracking-[-0.02em]">{label}</p>
        <p className={`mt-2 text-xs leading-relaxed ${dark ? "text-white/40" : "text-[#86868b]"}`}>
          Espaço reservado para a fotografia real do produto. Nenhum render provisório representa o design final.
        </p>
      </div>
    </div>
  );
}
