import React, { useMemo } from "react";
import { StatCard } from "../../SharedComponents";
import { CLASS_STATUS_STYLE, TOTAL_STAT_STYLE } from "../../../constants/teacherDashboardTheme";

// 4 thẻ (số chẵn — tránh lỗi bố cục lệch ở breakpoint tablet khi số thẻ lẻ):
// Tổng lớp/học sinh, Đang dạy, Chưa dạy (sắp khai giảng), Đã dạy.
const OverviewStatCards = ({ classes }) => {
  const summary = useMemo(() => {
    const byStatus = { ongoing: [], upcoming: [], ended: [] };
    classes.forEach((cls) => {
      byStatus[cls.status]?.push(cls);
    });
    const sumStudents = (list) =>
      list.reduce((sum, cls) => sum + cls.studentCount, 0);

    return {
      total: { classCount: classes.length, studentCount: sumStudents(classes) },
      ongoing: {
        classCount: byStatus.ongoing.length,
        studentCount: sumStudents(byStatus.ongoing),
      },
      upcoming: {
        classCount: byStatus.upcoming.length,
        studentCount: sumStudents(byStatus.upcoming),
      },
      ended: {
        classCount: byStatus.ended.length,
        studentCount: sumStudents(byStatus.ended),
      },
    };
  }, [classes]);

  const cards = [
    {
      key: "total",
      title: "Tổng lớp / học sinh",
      value: summary.total.classCount,
      subtitle: `· ${summary.total.studentCount} học sinh`,
      icon: TOTAL_STAT_STYLE.icon,
      color: TOTAL_STAT_STYLE.color,
    },
    {
      key: "ongoing",
      title: CLASS_STATUS_STYLE.ongoing.label,
      value: summary.ongoing.classCount,
      subtitle: `· ${summary.ongoing.studentCount} học sinh`,
      icon: CLASS_STATUS_STYLE.ongoing.icon,
      color: CLASS_STATUS_STYLE.ongoing.color,
    },
    {
      key: "upcoming",
      title: CLASS_STATUS_STYLE.upcoming.label,
      value: summary.upcoming.classCount,
      subtitle: `· ${summary.upcoming.studentCount} học sinh`,
      icon: CLASS_STATUS_STYLE.upcoming.icon,
      color: CLASS_STATUS_STYLE.upcoming.color,
    },
    {
      key: "ended",
      title: CLASS_STATUS_STYLE.ended.label,
      value: summary.ended.classCount,
      subtitle: `· ${summary.ended.studentCount} học sinh`,
      icon: CLASS_STATUS_STYLE.ended.icon,
      color: CLASS_STATUS_STYLE.ended.color,
    },
  ];

  return (
    <div className="row g-4 mb-4">
      {cards.map((card) => (
        <div className="col-md-3 col-6" key={card.key}>
          <StatCard
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            color={card.color}
          />
        </div>
      ))}
    </div>
  );
};

export default OverviewStatCards;
