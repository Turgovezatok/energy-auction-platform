const Footer = () => {
    return (
        <div className="mt-auto p-6 pt-0 text-center dark:text-white-dark ltr:sm:text-left rtl:sm:text-right">
            © {new Date().getFullYear()} energo.broker. Всички права запазени.
        </div>
    );
};

export default Footer;
