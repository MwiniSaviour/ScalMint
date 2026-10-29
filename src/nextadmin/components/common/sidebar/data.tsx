import {
  AlphabetIcon,
  HomeIcon,
  PieChartIcon,
  TableIcon,
  UserIcon,
  Widget4Icon,
  WindowIcon
} from "./icon";

export const NAV_DATA = [
  {
    label: "PROGRAMME",
    items: [
      {
        title: "Dashboard",
        icon: <HomeIcon />,
        items: [
          {
            title: "Overview",
            url: "/admin",
          },
        ],
      },
      {
        title: "Affiliates",
        url: "/admin/affiliates",
        icon: <UserIcon />,
        items: [],
      },
      {
        title: "Commissions",
        url: "/admin/commissions",
        icon: <PieChartIcon />,
        items: [],
      },
      {
        title: "Conversions",
        url: "/admin/conversions",
        icon: <TableIcon />,
        items: [],
      },
    ],
  },
  {
    label: "MAIN MENU",
    items: [
      {
        title: "Profile",
        url: "/admin/profile",
        icon: <UserIcon />,
        items: [],
      },
      {
        title: "Forms",
        icon: <AlphabetIcon />,
        items: [
          {
            title: "Form Elements",
            url: "/admin/form-elements",
          },
        ],
      },
      {
        title: "Tables",
        url: "/admin/tables",
        icon: <TableIcon />,
        items: [
          {
            title: "Basic Tables",
            url: "/admin/tables/basic-tables",
          },
        ],
      },
      {
        title: "Pages",
        icon: <WindowIcon />,
        items: [
          {
            title: "Error Page",
            url: "/admin/error-page",
          },
          {
            title: "Terms & Conditions",
            url: "/admin/terms-and-conditions",
          },
          {
            title: "Mail Success",
            url: "/admin/mail-success",
          },
        ],
      },
    ],
  },
  {
    label: "OTHERS",
    items: [
      {
        title: "Charts",
        icon: <PieChartIcon />,
        items: [
          {
            title: "Line Charts",
            url: "/admin/charts/line-charts",
          },
          {
            title: "Bar Charts",
            url: "/admin/charts/bar-charts",
          },
          {
            title: "Pie Charts",
            url: "/admin/charts/pie-charts",
          },
        ],
      },
      {
        title: "UI Elements",
        icon: <Widget4Icon />,
        items: [
          {
            title: "Accordion",
            url: "/admin/ui-elements/accordion",
          },
          {
            title: "Avatars",
            url: "/admin/ui-elements/avatars",
          },
          {
            title: "Buttons",
            url: "/admin/ui-elements/buttons",
          },
          {
            title: "Breadcrumbs",
            url: "/admin/ui-elements/breadcrumbs",
          },
          {
            title: "Progress",
            url: "/admin/ui-elements/progress",
          },
          {
            title: "Tooltips",
            url: "/admin/ui-elements/tooltips",
          },
        ],
      },
    ],
  },
];
