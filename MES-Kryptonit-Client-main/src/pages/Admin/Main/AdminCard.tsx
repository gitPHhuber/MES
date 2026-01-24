import { NavLink } from "react-router-dom";

type AdminCardProps = {
  image: string | React.ReactNode;
  title: string;
  description: string;
  onAdd?: () => void;
  editLink: string;
};

export const AdminCard = ({
  image,
  title,
  description,
  onAdd,
  editLink,
}: AdminCardProps) => (
  <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
    <div className="flex items-center gap-4">
      {typeof image === "string" ? (
        <img src={image} alt={title} className="w-12 h-12" />
      ) : (
        image
      )}
      <div>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
    <div className="mt-4 flex gap-2">
      {onAdd && (
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition"
          onClick={onAdd}
        >
          Добавить
        </button>
      )}
      <NavLink
        to={editLink}
        className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition"
      >
        Редактировать
      </NavLink>
    </div>
  </div>
);
