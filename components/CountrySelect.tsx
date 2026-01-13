"use client";

import Select from "react-select";
import { useMemo } from "react";

const countryList = require("react-select-country-list");

type Option = { label: string; value: string };

export default function CountrySelect({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) {
  const options = useMemo<Option[]>(
    () => countryList().getData(),
    []
  );

  const selected = options.find(o => o.value === value) ?? null;

  return (
    <Select
      options={options}
      value={selected}
      onChange={(opt) => onChange((opt as Option)?.value)}
      placeholder="Select country"
      className="text-sm"
      classNames={{
        control: () =>
          "border border-gray-300 rounded-lg min-h-[42px]",
      }}
    />
  );
}
