const Footer = () => {
    return (
        <div className="p-6 pt-0 mt-auto text-center dark:text-white-dark ltr:sm:text-left rtl:sm:text-right">
            © {new Date().getFullYear()} energo.broker. Всички права запазени.
        </div>
    );
};

export default Footer;
