import { DatePicker, Tooltip } from "@skbkontur/react-ui";
// import { ViewDateInputValidateChecks } from '@skbkontur/react-ui/components/DateInput/ViewDateInputValidateChecks';

import React from "react";

interface DateFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export const DateFilter: React.FC<DateFilterProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange
}) => {


  const [startValue, setStartValue] = React.useState("");
  const [endValue, setEndValue] = React.useState("");
  const [startError, setStartError] = React.useState(false);
  const [endError, setEndError] = React.useState(false);
  const [startTooltip, setStartTooltip] = React.useState(false);
  const [endTooltip, setEndTooltip] = React.useState(false);

  const minDate = "01.01.2025";
  const maxDate = "02.05.2028";
  React.useEffect(() => {
    setStartValue(startDate);
  }, [startDate]);

  React.useEffect(() => {
    setEndValue(endDate);
  }, [endDate]);

  const unvalidateStart = () => {
    setStartError(false);
    setStartTooltip(false);
  };

  const unvalidateEnd = () => {
    setEndError(false);
    setEndTooltip(false);
  };

  const validateStart = () => {
    const errorNew =
      !!startValue &&
      !DatePicker.validate(startValue, { minDate, maxDate });
    setStartError(errorNew);
    setStartTooltip(errorNew);
  };

  const validateEnd = () => {
    const errorNew =
      !!endValue &&
      !DatePicker.validate(endValue, { minDate, maxDate });
    setEndError(errorNew);
    setEndTooltip(errorNew);
  };

  React.useEffect(() => {
    if (!startError) onStartDateChange(startValue);
  }, [startValue]);

  React.useEffect(() => {
    if (!endError) onEndDateChange(endValue);
  }, [endValue]);


  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm text-white mb-1">Период:</div>

      <div className="flex justify-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white whitespace-nowrap">С:</span>
          <Tooltip
            trigger={startTooltip ? "opened" : "closed"}
            render={() => "Невалидная дата"}
            onCloseClick={() => setStartTooltip(false)}
          >
            <DatePicker
              error={startError}
              value={startValue}
              onValueChange={setStartValue}
              onFocus={unvalidateStart}
              onBlur={validateStart}
              minDate={minDate}
              maxDate={maxDate}
              enableTodayLink
              width={120}
            />
          </Tooltip>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-white whitespace-nowrap">По:</span>
          <Tooltip
            trigger={endTooltip ? "opened" : "closed"}
            render={() => "Невалидная дата"}
            onCloseClick={() => setEndTooltip(false)}
          >
            <DatePicker
              error={endError}
              value={endValue}
              onValueChange={setEndValue}
              onFocus={unvalidateEnd}
              onBlur={validateEnd}
              minDate={minDate}
              maxDate={maxDate}
              enableTodayLink
              width={120}
            />
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
