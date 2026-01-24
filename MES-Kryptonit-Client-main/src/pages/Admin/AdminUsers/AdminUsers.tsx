import { observer } from "mobx-react-lite";
import { useContext, useEffect } from "react";
import { fetchPC, fetchSession, fetchUsers } from "src/api/fcApi";
import { Context } from "src/main";
import { AdminOneUser } from "./AdminOneUser";
import { userGetModel } from "src/types/UserModel";
import { SessionModelFull } from "src/types/SessionModel";
import { deleteUser } from "src/api/userApi";

export const AdminUsers: React.FC = observer(() => {
  const context = useContext(Context);

  if (!context) {
    throw new Error("Context must be used within a Provider");
  }

  const { flightController } = context;

  const updateUsersList = async () => {
    fetchUsers().then((data) => flightController.setUsers(data));
    fetchSession().then((data) => flightController.setSessions(data));
    fetchPC().then((data) => flightController.setPCs(data));
  };

  useEffect(() => {
    updateUsersList();
  }, []);

  const getActiveSession = () => {
    return flightController.sessions.filter(
      (session: SessionModelFull) => session.online === true
    );
  };

  const getUsersOnlineID = () => {
    return (
      //в этом массиве сидят айдишники Юзеров у которого сессия в онлайне сейчас
      getActiveSession().map((session: SessionModelFull) => session.userId)
    );
  };

  const isOnline = (id: number) => {
    return getUsersOnlineID().includes(id);
  };

  const getCurrentPCName = (userId: number) => {
    const currentSession = getActiveSession().find(
      (session) => session.userId === userId
    );
    const currentPC = flightController.PCs.find(
      (pc) => pc.id === currentSession?.PCId
    );

    return currentPC;
  };

  const deleteCurrentUser = async (id: number) => {
    try {
      await deleteUser(id);
      updateUsersList();
    } catch (error: any) {
      console.error("Ошибка при удалении юзера:", error);
    }
  };

  let allUsers = flightController.users.map((user: userGetModel) => (
    <AdminOneUser
      key={user.id}
      ID={user.id}
      login={user.login}
      role={user.role}
      name={user.name}
      surName={user.surname}
      img={user.img}
      active={isOnline(user.id)}
      pcName={getCurrentPCName(user.id)?.pc_name}
      pcIP={getCurrentPCName(user.id)?.ip}
      updateUsersList={() => updateUsersList()}
      deleteUser={() => deleteCurrentUser(user.id)}
    />
  ));
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 text-center mb-6">
        📋 Список пользователей
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allUsers}
      </div>
    </div>
  );
});
