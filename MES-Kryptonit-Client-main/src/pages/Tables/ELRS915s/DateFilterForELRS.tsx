import { DatePicker, Gapped, Tooltip } from "@skbkontur/react-ui";
// import { ViewDateInputValidateChecks } from '@skbkontur/react-ui/components/DateInput/ViewDateInputValidateChecks';

import React, { useContext, useEffect } from "react";
import { Context } from "src/main";

export const DateFilterforElrs: React.FC = () => {
  const context = useContext(Context);

  if (!context) {
    throw new Error("Context must be used within a Provider");
  }

  const { elrsStore } = context;

  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState(false);
  const [tooltip, setTooltip] = React.useState(false);

  const minDate = "01.01.2025";
  const maxDate = "02.05.2028";

  const unvalidate = () => {
    setError(false);
    setTooltip(false);
  };

  const validate = () => {
    const errorNew =
      !!value &&
      !DatePicker.validate(value, { minDate: minDate, maxDate: maxDate });
    setError(errorNew);
    setTooltip(errorNew);
  };

  let removeTooltip = () => setTooltip(false);

  useEffect(() => {
    if (!error) {
      elrsStore.setSelectedDate(value);
    }
  }, [value]);

  return (
    <Gapped gap={10} vertical>
      {/* <ViewDateInputValidateChecks value={value} minDate={minDate} maxDate={maxDate} />
        <pre>
          minDate = {minDate}
          <br />
          maxDate = {maxDate}
        </pre>
       */}
      <Tooltip
        trigger={tooltip ? "opened" : "closed"}
        render={() => "Невалидная дата"}
        onCloseClick={removeTooltip}
      >
        <DatePicker
          error={error}
          value={value}
          onValueChange={setValue}
          onFocus={unvalidate}
          onBlur={validate}
          minDate={minDate}
          maxDate={maxDate}
          enableTodayLink
        />
      </Tooltip>
      {/* {elrsStore.selectedDate(value)} */}
    </Gapped>
  );
};
