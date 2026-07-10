
'use client';

import PerfectScrollbar from 'react-perfect-scrollbar';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import AnimateHeight from 'react-animate-height';

import { toggleSidebar } from '@/store/themeConfigSlice';
import { IRootState } from '@/store';

import IconCaretsDown from '@/components/icon/icon-carets-down';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconMinus from '@/components/icon/icon-minus';
import IconMenuDashboard from '@/components/icon/menu/icon-menu-dashboard';
import IconMenuInvoice from '@/components/icon/menu/icon-menu-invoice';
import IconMenuCharts from '@/components/icon/menu/icon-menu-charts';
import IconMenuTables from '@/components/icon/menu/icon-menu-tables';
import IconMenuUsers from '@/components/icon/menu/icon-menu-users';
import IconMenuPages from '@/components/icon/menu/icon-menu-pages';

const Sidebar = () => {
    const dispatch = useDispatch();
    const pathname = usePathname();

    const [currentMenu, setCurrentMenu] = useState<string>('');

    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);

    const toggleMenu = (value: string) => {
        setCurrentMenu((oldValue) => (oldValue === value ? '' : value));
    };

    useEffect(() => {
        const allLinks = document.querySelectorAll('.sidebar ul a.active');

        for (let i = 0; i < allLinks.length; i++) {
            allLinks[i]?.classList.remove('active');
        }

        const selector = document.querySelector(
            '.sidebar ul a[href="' + window.location.pathname + '"]'
        );

        selector?.classList.add('active');

        const submenu = selector?.closest('ul.sub-menu');

        if (submenu) {
            const parentMenu = submenu.closest('li.menu');
            const button = parentMenu?.querySelector('button.nav-link') as HTMLElement | null;
            button?.click();
        }

        if (window.innerWidth < 1024 && themeConfig.sidebar) {
            dispatch(toggleSidebar());
        }
    }, [pathname]);

    return (
        <div className={semidark ? 'dark' : ''}>
            <nav
                className={`sidebar fixed bottom-0 top-0 z-50 h-full min-h-screen w-[260px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] transition-all duration-300 ${
                    semidark ? 'text-white-dark' : ''
                }`}
            >
                <div className="h-full bg-white dark:bg-black">
                    <div className="flex items-center justify-between px-4 py-3">
                        <Link href="/" className="main-logo flex shrink-0 items-center">
                            <img
                                className="ml-[5px] w-8 flex-none"
                                src="/assets/images/logo.svg"
                                alt="energo.broker"
                            />

                            <span className="align-middle text-2xl font-semibold ltr:ml-1.5 rtl:mr-1.5 dark:text-white-light lg:inline">
                                energo.broker
                            </span>
                        </Link>

                        <button
                            type="button"
                            className="collapse-icon flex h-8 w-8 items-center rounded-full transition duration-300 hover:bg-gray-500/10 rtl:rotate-180 dark:text-white-light dark:hover:bg-dark-light/10"
                            onClick={() => dispatch(toggleSidebar())}
                            aria-label="Свиване на менюто"
                        >
                            <IconCaretsDown className="m-auto rotate-90" />
                        </button>
                    </div>

                    <PerfectScrollbar className="relative h-[calc(100vh-80px)]">
                        <ul className="relative space-y-0.5 p-4 py-0 font-semibold">
                            <li className="nav-item">
                                <Link href="/" className="group">
                                    <div className="flex items-center">
                                        <IconMenuDashboard className="shrink-0 group-hover:!text-primary" />
                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">
                                            Табло
                                        </span>
                                    </div>
                                </Link>
                            </li>

                            <h2 className="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                <IconMinus className="hidden h-5 w-4 flex-none" />
                                <span>Търгове</span>
                            </h2>

                            <li className="menu nav-item">
                                <button
                                    type="button"
                                    className={`${currentMenu === 'auctions' ? 'active' : ''} nav-link group w-full`}
                                    onClick={() => toggleMenu('auctions')}
                                >
                                    <div className="flex items-center">
                                        <IconMenuInvoice className="shrink-0 group-hover:!text-primary" />
                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">
                                            Енергийни търгове
                                        </span>
                                    </div>

                                    <div className={currentMenu !== 'auctions' ? '-rotate-90 rtl:rotate-90' : ''}>
                                        <IconCaretDown />
                                    </div>
                                </button>

                                <AnimateHeight duration={300} height={currentMenu === 'auctions' ? 'auto' : 0}>
                                    <ul className="sub-menu text-gray-500">
                                        <li>
                                            <Link href="/create-auction">Създай търг</Link>
                                        </li>
                                        <li>
                                            <Link href="/my-auctions">Моите търгове</Link>
                                        </li>
                                        <li>
                                            <Link href="/auctions">Всички търгове</Link>
                                        </li>
                                    </ul>
                                </AnimateHeight>
                            </li>

                            <h2 className="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                <IconMinus className="hidden h-5 w-4 flex-none" />
                                <span>Анализи</span>
                            </h2>

                            <li className="menu nav-item">
                                <button
                                    type="button"
                                    className={`${currentMenu === 'forecast' ? 'active' : ''} nav-link group w-full`}
                                    onClick={() => toggleMenu('forecast')}
                                >
                                    <div className="flex items-center">
                                        <IconMenuCharts className="shrink-0 group-hover:!text-primary" />
                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">
                                            Прогнози
                                        </span>
                                    </div>

                                    <div className={currentMenu !== 'forecast' ? '-rotate-90 rtl:rotate-90' : ''}>
                                        <IconCaretDown />
                                    </div>
                                </button>

                                <AnimateHeight duration={300} height={currentMenu === 'forecast' ? 'auto' : 0}>
                                    <ul className="sub-menu text-gray-500">
                                        <li>
                                            <Link href="/forecast">Ценова прогноза</Link>
                                        </li>
                                        <li>
                                            <Link href="/capture-analytics">Capture Analytics</Link>
                                        </li>
                                        <li>
                                            <Link href="/solar-capture">Solar Capture</Link>
                                        </li>
                                    </ul>
                                </AnimateHeight>
                            </li>

                            <h2 className="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                <IconMinus className="hidden h-5 w-4 flex-none" />
                                <span>Данни</span>
                            </h2>

                            <li className="nav-item">
                                <Link href="/process-invoice" className="group">
                                    <div className="flex items-center">
                                        <IconMenuTables className="shrink-0 group-hover:!text-primary" />
                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">
                                            Обработка на фактура
                                        </span>
                                    </div>
                                </Link>
                            </li>

                            <li className="nav-item">
                                <Link href="/confirm-auction" className="group">
                                    <div className="flex items-center">
                                        <IconMenuPages className="shrink-0 group-hover:!text-primary" />
                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">
                                            Потвърждение на търг
                                        </span>
                                    </div>
                                </Link>
                            </li>

                            <h2 className="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                <IconMinus className="hidden h-5 w-4 flex-none" />
                                <span>Профил</span>
                            </h2>

                            <li className="nav-item">
                                <Link href="/mydashboard" className="group">
                                    <div className="flex items-center">
                                        <IconMenuUsers className="shrink-0 group-hover:!text-primary" />
                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">
                                            Потребителски профил
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        </ul>
                    </PerfectScrollbar>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;