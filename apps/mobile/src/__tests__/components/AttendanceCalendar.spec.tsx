import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AttendanceCalendar } from '../../presentation/components/attendance/AttendanceCalendar';

describe('AttendanceCalendar', () => {
  // Use a fixed month where we know the layout:
  // March 2026 starts on Sunday (day 0), has 31 days
  const month = '2026-03';
  const absentDates = ['2026-03-02', '2026-03-05'];
  const holidayDates = ['2026-03-10'];

  it('renders the calendar container', () => {
    render(
      <AttendanceCalendar month={month} absentDates={absentDates} holidayDates={holidayDates} />,
    );
    expect(screen.getByTestId('attendance-calendar')).toBeTruthy();
  });

  it('renders weekday headers', () => {
    render(
      <AttendanceCalendar month={month} absentDates={[]} holidayDates={[]} />,
    );
    expect(screen.getByText('Sun')).toBeTruthy();
    expect(screen.getByText('Mon')).toBeTruthy();
    expect(screen.getByText('Tue')).toBeTruthy();
    expect(screen.getByText('Wed')).toBeTruthy();
    expect(screen.getByText('Thu')).toBeTruthy();
    expect(screen.getByText('Fri')).toBeTruthy();
    expect(screen.getByText('Sat')).toBeTruthy();
  });

  it('renders all 31 days for March', () => {
    render(
      <AttendanceCalendar month={month} absentDates={[]} holidayDates={[]} />,
    );
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('15')).toBeTruthy();
    expect(screen.getByText('31')).toBeTruthy();
  });

  it('marks absent days with correct accessibility label', () => {
    render(
      <AttendanceCalendar month={month} absentDates={absentDates} holidayDates={holidayDates} />,
    );
    const day2 = screen.getByTestId('cal-day-2');
    expect(day2.props.accessibilityLabel).toBe('Day 2, absent');
  });

  it('marks holiday days with correct accessibility label', () => {
    render(
      <AttendanceCalendar month={month} absentDates={absentDates} holidayDates={holidayDates} />,
    );
    const day10 = screen.getByTestId('cal-day-10');
    expect(day10.props.accessibilityLabel).toBe('Day 10, holiday');
  });

  it('renders the legend', () => {
    render(
      <AttendanceCalendar month={month} absentDates={[]} holidayDates={[]} />,
    );
    expect(screen.getByText('Present')).toBeTruthy();
    expect(screen.getByText('Absent')).toBeTruthy();
    expect(screen.getByText('Holiday')).toBeTruthy();
  });

  it('handles months starting on different days (Feb 2026 starts on Sunday)', () => {
    render(
      <AttendanceCalendar month="2026-02" absentDates={[]} holidayDates={[]} />,
    );
    // February 2026 has 28 days
    expect(screen.getByText('28')).toBeTruthy();
    expect(screen.queryByText('29')).toBeNull();
  });
});
