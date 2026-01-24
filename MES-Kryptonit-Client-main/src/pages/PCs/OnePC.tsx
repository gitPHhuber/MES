import clsx from "clsx";

interface OnePCProps {
  active: boolean;
  onClick: () => void;
  PCname: string;
  IP: string;
  userName: string;
  userSurname: string;
}

export const OnePC: React.FC<OnePCProps> = ({
  active,
  onClick,
  PCname,
  IP,
  userName,
  userSurname
}) => {
  return (
    <div className="flex justify-center items-center">
      <div
        className={clsx(
          "p-3 rounded-lg shadow-md mb-2 border-l-4 transition duration-200 w-1/3",
          active
            ? "bg-red-500 text-white border-red-700 pointer-events-none opacity-70"
            : "bg-gray-100 text-gray-800 border-emerald-500 hover:bg-gray-400 cursor-pointer"
        )}
        onClick={!active ? onClick : undefined} 
      >
        <p className="text-lg font-semibold">{PCname}</p>
        <p className="text-sm">{IP}</p>

        {active && (
          <p className="text-xs font-semibold mt-2 bg-red-700 px-2 py-1 rounded-md text-center">
            ПК занят {userName} {userSurname} 
          </p>
        )}
      </div>
    </div>
  );
};
