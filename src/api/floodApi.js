
import eventsData from '../data/events.json';

const REAL_EVENT_ID = 'feni-noakhali-2024';

const DISTRICT_SUMMARY_URL =
  '/data/floodsar/2024/district_summary.json';

const EXPECTED_DISTRICTS = ['Feni', 'Noakhali'];

// Accept the actual exported field names and common aliases.
// Missing values remain null; they are never silently replaced
// with fabricated measurements.
function pickNumber(row, aliases) {
  for (const key of aliases) {
    const raw = row[key];

    if (raw === undefined || raw === null || raw === '') {
      continue;
    }

    const value = Number(raw);

    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function sumField(rows, field) {
  const values = rows.map((row) => row[field]);

  if (
    values.length === 0 ||
    !values.every((value) => Number.isFinite(value))
  ) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0);
}

function weightedPercent(rows, percentField, weightField) {
  if (
    rows.length === 0 ||
    !rows.every(
      (row) =>
        Number.isFinite(row[percentField]) &&
        Number.isFinite(row[weightField]) &&
        row[weightField] >= 0
    )
  ) {
    return null;
  }

  const totalWeight = rows.reduce(
    (total, row) => total + row[weightField],
    0
  );

  if (totalWeight <= 0) {
    return null;
  }

  return rows.reduce(
    (total, row) =>
      total + row[percentField] * row[weightField],
    0
  ) / totalWeight;
}

function normalizeDistrict(row) {
  const district = String(
    row.district ?? row.region ?? row.DISTRICT ?? ''
  ).trim();

  const gain18 = pickNumber(row, [
    'candidate_gain_m18_km2',
    'candidate_new_water_m18_km2',
    'candidate_new_water_km2',
  ]);

  const loss18 = pickNumber(row, [
    'candidate_loss_m18_km2',
    'candidate_water_loss_m18_km2',
    'candidate_water_loss_km2',
  ]);

  const gain16 = pickNumber(row, [
    'candidate_gain_m16_km2',
    'candidate_new_water_m16_km2',
  ]);

  const loss16 = pickNumber(row, [
    'candidate_loss_m16_km2',
    'candidate_water_loss_m16_km2',
  ]);

  return {
    district,

    original_boundary_area_km2: pickNumber(row, [
      'original_boundary_area_km2',
    ]),

    rasterized_area_km2: pickNumber(row, [
      'rasterized_area_km2',
    ]),

    common_valid_area_km2: pickNumber(row, [
      'common_valid_area_km2',
    ]),

    common_valid_coverage_percent: pickNumber(row, [
      'common_valid_coverage_percent',
    ]),

    opera_open_water_km2: pickNumber(row, [
      'opera_open_water_km2',
    ]),

    opera_product_coverage_percent: pickNumber(row, [
      'opera_product_coverage_percent',
    ]),

    opera_product_data_area_km2: pickNumber(row, [
      'opera_product_data_area_km2',
    ]),

    candidate_gain_m18_km2: gain18,
    candidate_loss_m18_km2: loss18,

    net_candidate_change_m18_km2:
      gain18 !== null && loss18 !== null
        ? gain18 - loss18
        : pickNumber(row, [
            'net_candidate_change_m18_km2',
            'net_candidate_water_change_m18_km2',
            'net_candidate_water_change_km2',
          ]),

    candidate_gain_m16_km2: gain16,
    candidate_loss_m16_km2: loss16,

    net_candidate_change_m16_km2:
      gain16 !== null && loss16 !== null
        ? gain16 - loss16
        : pickNumber(row, [
            'net_candidate_change_m16_km2',
            'net_candidate_water_change_m16_km2',
            'net_candidate_water_change_km2',
          ]),
  };
}

function aggregateDistricts(districts) {
  const gain18 = sumField(
    districts,
    'candidate_gain_m18_km2'
  );

  const loss18 = sumField(
    districts,
    'candidate_loss_m18_km2'
  );

  const gain16 = sumField(
    districts,
    'candidate_gain_m16_km2'
  );

  const loss16 = sumField(
    districts,
    'candidate_loss_m16_km2'
  );

  return {
    is_sample: false,
    source: 'Earth Engine exported district summary',

    event_id: REAL_EVENT_ID,
    before_date: '2024-08-09',
    after_date: '2024-08-21',
    pixel_size_m: 30,

    districts,

    district_count: districts.length,

    original_boundary_area_km2: sumField(
      districts,
      'original_boundary_area_km2'
    ),

    rasterized_area_km2: sumField(
      districts,
      'rasterized_area_km2'
    ),

    common_valid_area_km2: sumField(
      districts,
      'common_valid_area_km2'
    ),

    common_valid_coverage_percent: weightedPercent(
      districts,
      'common_valid_coverage_percent',
      'rasterized_area_km2'
    ),

    opera_open_water_km2: sumField(
      districts,
      'opera_open_water_km2'
    ),

    opera_product_data_area_km2: sumField(
      districts,
      'opera_product_data_area_km2'
    ),

    opera_product_coverage_percent: weightedPercent(
      districts,
      'opera_product_coverage_percent',
      'original_boundary_area_km2'
    ),

    candidate_gain_m18_km2: gain18,
    candidate_loss_m18_km2: loss18,

    net_candidate_change_m18_km2:
      gain18 !== null && loss18 !== null
        ? gain18 - loss18
        : null,

    candidate_gain_m16_km2: gain16,
    candidate_loss_m16_km2: loss16,

    net_candidate_change_m16_km2:
      gain16 !== null && loss16 !== null
        ? gain16 - loss16
        : null,
  };
}

export const getEvents = async () => eventsData;

export const getEvent = async (id) => {
  return eventsData.find((event) => event.id === id) ?? null;
};

export const getFloodStats = async (id) => {
  // Sylhet statistics are sourced from the validated S1.17/S1.18 export.
  if (id === 'sylhet-2022') {
    const response = await fetch(
      '/data/floodsar/2022/sylhet/stats_sylhet.json',
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(
        `Could not load Sylhet statistics: HTTP ${response.status}`
      );
    }

    const data = await response.json();
    if (
      data.event_id !== 'sylhet-2022' ||
      data.comparison_date !== '2022-06-18'
    ) {
      throw new Error(
        'Sylhet statistics have an unexpected event ID or comparison date.'
      );
    }

    const requiredNumericFields = [
      'district_area_km2',
      'strict_evaluation_area_km2',
      'alos_positive_area_district_km2',
      'alos_positive_area_strict_km2',
      'gfm_flood_strict_area_km2',
      'candidate_gain_m18_km2',
      'candidate_loss_m18_km2',
      'net_candidate_change_m18_km2',
      'candidate_gain_m16_km2',
      'candidate_loss_m16_km2',
      'net_candidate_change_m16_km2',
      'strict_gfm_positive_overlap_pct',
      'strict_sar_m18_positive_overlap_pct',
      'strict_sar_m16_positive_overlap_pct',
      'candidate_transition_valid_area_km2',
      'alos_positive_area_outside_strict_km2',
      'alos_positive_outside_due_to_gfm_exclusion_km2',
      'alos_positive_outside_due_to_reference_water_km2',
    ];

    for (const field of requiredNumericFields) {
      if (
        data[field] === null ||
        data[field] === undefined ||
        !Number.isFinite(Number(data[field]))
      ) {
        throw new Error(`Sylhet statistics are missing a valid ${field}.`);
      }
    }

    return {
      ...data,
      pixel_size_m: 30,
      is_sample: false,
      source: 'S1.17/S1.18 validated Sylhet raster export',
    };
  }

  // Do not display old sample statistics for unsupported events.
  if (id !== REAL_EVENT_ID) {
    return null;
  }

  const response = await fetch(DISTRICT_SUMMARY_URL, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `Could not load district summary: HTTP ${response.status}`
    );
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error(
      'District summary must contain a JSON array.'
    );
  }

  const districts = data
    .map(normalizeDistrict)
    .filter((row) =>
      EXPECTED_DISTRICTS.includes(row.district)
    )
    .sort(
      (a, b) =>
        EXPECTED_DISTRICTS.indexOf(a.district) -
        EXPECTED_DISTRICTS.indexOf(b.district)
    );

  const actualNames = districts.map((row) => row.district);

  if (
    districts.length !== 2 ||
    !EXPECTED_DISTRICTS.every((name) =>
      actualNames.includes(name)
    )
  ) {
    throw new Error(
      'Expected district records for both Feni and Noakhali.'
    );
  }

  for (const district of districts) {
    if (
      !Number.isFinite(district.candidate_gain_m18_km2) ||
      !Number.isFinite(district.candidate_loss_m18_km2) ||
      !Number.isFinite(district.candidate_gain_m16_km2) ||
      !Number.isFinite(district.candidate_loss_m16_km2)
    ) {
      throw new Error(
        `Candidate gain/loss values are missing for ${district.district}. ` +
        'Check the field names in district_summary.json.'
      );
    }
  }

  return aggregateDistricts(districts);
};

// Synthetic polygon helpers have been intentionally disabled.
// Real raster data is served through MapLibre XYZ tiles instead.
export const getWaterMask = async () => null;

export const getFloodChange = async () => null;
