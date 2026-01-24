import Logo from "assets/images/logo.svg";
import PhoneIcon from "assets/icons/Phone.svg";
import MailIcon from "assets/icons/mail.svg";
import LogoVK from "assets/icons/logoVK.svg";
import LogoYT from "assets/icons/logoYOUT.svg";

export const Footer: React.FC = () => {
  return (
    <div className="flex justify-between items-center px-8 py-4 bg-white text-gray-800">
      <div className="flex items-center">
        <img src={Logo} alt="Logo" className="h-6 mr-2" />
        <div>
          <div>© 2018-2025 Криптонит</div>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="flex items-center mb-1">
          <img src={PhoneIcon} alt="Phone" className="h-4 mr-2" />
          <div>+7 (499) 455 04 13</div>
        </div>
        <div className="flex items-center">
          <img src={MailIcon} alt="Mail" className="h-4 mr-2" />
          <div>office.npk@kryptonite.ru</div>
        </div>
      </div>

      <div className="flex items-center">
        <img src={LogoVK} alt="VK" className="h-8 mr-4" />
        <img src={LogoYT} alt="YouTube" className="h-8" />
      </div>
    </div>
  );
};
