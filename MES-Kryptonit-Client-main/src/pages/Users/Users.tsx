import { observer } from "mobx-react-lite";
import { useContext, useEffect } from "react";
import { fetchPC, fetchSession, fetchUsers } from "src/api/fcApi";
import { Context } from "src/main";
import { OneUser } from "./OneUser";
import { userGetModel } from "src/types/UserModel";
import { SessionModelFull } from "src/types/SessionModel";

export const Users: React.FC = observer(() => {
  const context = useContext(Context);

  if (!context) {
    throw new Error("Context must be used within a Provider");
  }

  const { flightController } = context;

  useEffect(() => {
    fetchUsers().then((data) => flightController.setUsers(data));
    fetchSession().then((data) => flightController.setSessions(data));
    fetchPC().then((data) => flightController.setPCs(data));
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
    console.log(currentSession? currentSession.PCId : '00000')
    const currentPC = flightController.PCs.find(
      (pc) => pc.id === currentSession?.PCId
    );

    return currentPC;
  };

  let allUsers = flightController.users.map((user: userGetModel) => (
    <OneUser
      key={user.id}
      login={user.login}
      role={user.role}
      name={user.name}
      surName={user.surname}
      img = {user.img}
      active={isOnline(user.id)}
      pcName={getCurrentPCName(user.id)?.pc_name}
      pcIP={getCurrentPCName(user.id)?.ip}
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
