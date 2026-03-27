import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Opportunity } from "@/hooks/useOpportunities";
import { useAccounts } from "@/hooks/useAccounts";
import { useContacts } from "@/hooks/useContacts";
import { supabase } from "@/integrations/supabase/client";

const opportunitySchema = z.object({
  opportunity_number: z.string().optional(),
  account_id: z.string().min(1, "Organization is required"),
  primary_contact_id: z.string().optional().or(z.literal("")),
  name: z.string().min(1, "Name is required").max(255),
  stage: z.string().min(1, "Stage is required"),
  amount: z.string().optional().or(z.literal("")),
  probability: z.string().optional().or(z.literal("")),
  close_date: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  // New fields
  opp_type: z.string().optional().or(z.literal("")),
  sub_type: z.string().optional().or(z.literal("")),
  total_contract_value: z.string().optional().or(z.literal("")),
  sales_support_notes: z.string().optional().or(z.literal("")),
  active_contract: z.boolean().optional(),
  actual_close_date: z.string().optional().or(z.literal("")),
  contract_start_date: z.string().optional().or(z.literal("")),
  forecast_category: z.string().optional().or(z.literal("")),
  // Loss Details
  loss_reason: z.string().optional().or(z.literal("")),
  loss_reason_note: z.string().optional().or(z.literal("")),
  // RFP
  rfp: z.boolean().optional(),
  rfp_stage: z.string().optional().or(z.literal("")),
  response_deadline: z.string().optional().or(z.literal("")),
  rfp_website: z.string().optional().or(z.literal("")),
  rfp_notes: z.string().optional().or(z.literal("")),
  rfp_shipped_date: z.string().optional().or(z.literal("")),
  // Team
  co_salesperson_id: z.string().optional().or(z.literal("")),
  engineer_id: z.string().optional().or(z.literal("")),
  mentor_id: z.string().optional().or(z.literal("")),
  market_consultant_id: z.string().optional().or(z.literal("")),
  mc_assigned_date: z.string().optional().or(z.literal("")),
  market_consultant_2_id: z.string().optional().or(z.literal("")),
  mc_2_assigned_date: z.string().optional().or(z.literal("")),
  legacy_owner: z.string().optional().or(z.literal("")),
  legacy_created_date: z.string().optional().or(z.literal("")),
  // DRF
  drf_received_date: z.string().optional().or(z.literal("")),
  drf_primary_contact_id: z.string().optional().or(z.literal("")),
  drf_submitter_name: z.string().optional().or(z.literal("")),
  drf_submitter_email: z.string().optional().or(z.literal("")),
  drf_submitter_title: z.string().optional().or(z.literal("")),
  drf_submitter_phone: z.string().optional().or(z.literal("")),
  // Overview
  number_of_employees: z.string().optional().or(z.literal("")),
  hours_of_operation: z.string().optional().or(z.literal("")),
  number_of_buildings: z.string().optional().or(z.literal("")),
  jointly_owned_buildings: z.string().optional().or(z.literal("")),
  square_footage: z.string().optional().or(z.literal("")),
  number_of_schools_campuses: z.string().optional().or(z.literal("")),
  membership_enrollment: z.string().optional().or(z.literal("")),
  cost_per_student: z.string().optional().or(z.literal("")),
  cost_per_square_foot: z.string().optional().or(z.literal("")),
  // Energy Current
  electricity_current: z.string().optional().or(z.literal("")),
  solar_current: z.string().optional().or(z.literal("")),
  natural_gas_current: z.string().optional().or(z.literal("")),
  water_sewer_current: z.string().optional().or(z.literal("")),
  heating_oil_current: z.string().optional().or(z.literal("")),
  other_utility_current: z.string().optional().or(z.literal("")),
  other_utility_type: z.string().optional().or(z.literal("")),
  annual_utility_costs: z.string().optional().or(z.literal("")),
  reporting_period_start_actuals: z.string().optional().or(z.literal("")),
  reporting_period_end_actuals: z.string().optional().or(z.literal("")),
  reporting_period: z.string().optional().or(z.literal("")),
  // Energy Budget
  budgeted_electricity: z.string().optional().or(z.literal("")),
  budgeted_solar: z.string().optional().or(z.literal("")),
  budgeted_natural_gas: z.string().optional().or(z.literal("")),
  budgeted_water_sewer: z.string().optional().or(z.literal("")),
  budgeted_heating_oil: z.string().optional().or(z.literal("")),
  budgeted_other_expense: z.string().optional().or(z.literal("")),
  budgeted_annual_utility_costs: z.string().optional().or(z.literal("")),
  reporting_period_start_budget: z.string().optional().or(z.literal("")),
  reporting_period_end_budget: z.string().optional().or(z.literal("")),
  budgeted_exp_reporting_period: z.string().optional().or(z.literal("")),
  budgeted_exp_reporting_period_mos: z.string().optional().or(z.literal("")),
  // Additional Info
  electricity_vendor: z.string().optional().or(z.literal("")),
  sites_powered_solar_next_2yrs: z.string().optional().or(z.literal("")),
  water_treatment_plants: z.boolean().optional(),
  number_of_water_treatment_plants: z.string().optional().or(z.literal("")),
  utility_dept_allocation: z.string().optional().or(z.literal("")),
  central_heating_cooling_plant: z.boolean().optional(),
  smart_meters: z.string().optional().or(z.literal("")),
  smart_meter_count: z.string().optional().or(z.literal("")),
  smart_meter_percentage: z.string().optional().or(z.literal("")),
  interval_data: z.string().optional().or(z.literal("")),
  sq_footage_central_plant: z.string().optional().or(z.literal("")),
  generate_own_power: z.boolean().optional(),
  buildings_served_central_plant: z.string().optional().or(z.literal("")),
  allocate_plant_costs: z.boolean().optional(),
  buildings_wind: z.string().optional().or(z.literal("")),
  buildings_cogeneration: z.string().optional().or(z.literal("")),
  buildings_battery: z.string().optional().or(z.literal("")),
  additional_sqft_planned_2yrs: z.string().optional().or(z.literal("")),
  additional_sqft_planned: z.string().optional().or(z.literal("")),
  energy_accounting_software: z.string().optional().or(z.literal("")),
  profile_notes: z.string().optional().or(z.literal("")),
  included_all_expenditures: z.boolean().optional(),
  // Healthcare
  hospital_square_footage: z.string().optional().or(z.literal("")),
  number_of_hospitals: z.string().optional().or(z.literal("")),
  outpatient_center_sqft: z.string().optional().or(z.literal("")),
  number_of_outpatient_clinics: z.string().optional().or(z.literal("")),
  medical_office_sqft: z.string().optional().or(z.literal("")),
  number_professional_office_bldgs: z.string().optional().or(z.literal("")),
  clinics_square_footage: z.string().optional().or(z.literal("")),
  hospital_beds: z.string().optional().or(z.literal("")),
  other_healthcare_sqft: z.string().optional().or(z.literal("")),
  onsite_electrical_generation_kw: z.string().optional().or(z.literal("")),
  onsite_electrical_generation_type: z.string().optional().or(z.literal("")),
  // Churches
  senior_pastor: z.string().optional().or(z.literal("")),
  executive_pastor: z.string().optional().or(z.literal("")),
  church_membership_enrollment: z.string().optional().or(z.literal("")),
  average_weekly_attendance: z.string().optional().or(z.literal("")),
  // Matrix fields
  matrix_approved_date: z.string().optional().or(z.literal("")),
  contract_term_months: z.string().optional().or(z.literal("")),
  billable_term_months: z.string().optional().or(z.literal("")),
  perf_fee_percent: z.string().optional().or(z.literal("")),
  fee_type: z.string().optional().or(z.literal("")),
  qs_months: z.string().optional().or(z.literal("")),
  billing_type: z.string().optional().or(z.literal("")),
  matrix_utility_spend: z.string().optional().or(z.literal("")),
  new_contracts_gross_monthly_fee: z.string().optional().or(z.literal("")),
  new_contracts_gross_annual_fee: z.string().optional().or(z.literal("")),
  estimated_net_monthly_fee: z.string().optional().or(z.literal("")),
  estimated_net_annual_fee: z.string().optional().or(z.literal("")),
  fixed_annual_fee: z.string().optional().or(z.literal("")),
  gross_monthly_fee_py1: z.string().optional().or(z.literal("")),
  gross_monthly_fee_py2: z.string().optional().or(z.literal("")),
  gross_monthly_fee_py3: z.string().optional().or(z.literal("")),
  gross_monthly_fee_py4: z.string().optional().or(z.literal("")),
  gross_monthly_fee_py5: z.string().optional().or(z.literal("")),
  gross_monthly_fee_py6: z.string().optional().or(z.literal("")),
  net_monthly_fee_py1: z.string().optional().or(z.literal("")),
  net_monthly_fee_py2: z.string().optional().or(z.literal("")),
  net_monthly_fee_py3: z.string().optional().or(z.literal("")),
  net_monthly_fee_py4: z.string().optional().or(z.literal("")),
  net_monthly_fee_py5: z.string().optional().or(z.literal("")),
  net_monthly_fee_py6: z.string().optional().or(z.literal("")),
  software_type: z.string().optional().or(z.literal("")),
  discount_percent: z.string().optional().or(z.literal("")),
  greenx_annual_allocation: z.string().optional().or(z.literal("")),
  ecap_software_fee: z.string().optional().or(z.literal("")),
  simulate_annual_allocation: z.string().optional().or(z.literal("")),
  ecap_fee_payments: z.string().optional().or(z.literal("")),
  executive_annual_allocation: z.string().optional().or(z.literal("")),
  ecap_maintenance_fee: z.string().optional().or(z.literal("")),
  measure_annual_allocation: z.string().optional().or(z.literal("")),
  ecap_renewal_payments: z.string().optional().or(z.literal("")),
  es_employed_by: z.string().optional().or(z.literal("")),
  es_estimated_salary_annual: z.string().optional().or(z.literal("")),
  es_ft: z.string().optional().or(z.literal("")),
  es_estimated_salary_monthly: z.string().optional().or(z.literal("")),
  es_pt: z.string().optional().or(z.literal("")),
  visits_per_month: z.string().optional().or(z.literal("")),
  savings_percent: z.string().optional().or(z.literal("")),
  qs_net_savings: z.string().optional().or(z.literal("")),
  year_1_gross_savings: z.string().optional().or(z.literal("")),
  year_1_net_savings: z.string().optional().or(z.literal("")),
  year_2_gross_savings: z.string().optional().or(z.literal("")),
  year_2_net_savings: z.string().optional().or(z.literal("")),
  year_3_gross_savings: z.string().optional().or(z.literal("")),
  year_3_net_savings: z.string().optional().or(z.literal("")),
  year_4_gross_savings: z.string().optional().or(z.literal("")),
  year_4_net_savings: z.string().optional().or(z.literal("")),
  year_5_gross_savings: z.string().optional().or(z.literal("")),
  year_5_net_savings: z.string().optional().or(z.literal("")),
  year_6_gross_savings: z.string().optional().or(z.literal("")),
  year_6_net_savings: z.string().optional().or(z.literal("")),
  year_7_gross_savings: z.string().optional().or(z.literal("")),
  year_7_net_savings: z.string().optional().or(z.literal("")),
  year_8_gross_savings: z.string().optional().or(z.literal("")),
  year_8_net_savings: z.string().optional().or(z.literal("")),
  year_9_gross_savings: z.string().optional().or(z.literal("")),
  year_9_net_savings: z.string().optional().or(z.literal("")),
  year_10_gross_savings: z.string().optional().or(z.literal("")),
  year_10_net_savings: z.string().optional().or(z.literal("")),
  proposal_total_gross_savings: z.string().optional().or(z.literal("")),
  proposal_total_net_savings: z.string().optional().or(z.literal("")),
  matrix_notes: z.string().optional().or(z.literal("")),
});

type OpportunityFormData = z.infer<typeof opportunitySchema>;

const stages = [
  "Prospecting",
  "Qualified",
  "Quoted",
  "Contracting",
  "Closed Won",
  "Closed Lost",
];

const oppTypes = ["New", "Renewal", "Expansion"];
const subTypes = ["No Fee +", "Standard", "Custom"];
const forecastCategories = ["Pipeline", "Best Case", "Commit", "Closed"];

interface OpportunityFormProps {
  opportunity?: any;
  onSubmit: (data: Partial<Opportunity>) => void;
  onCancel: () => void;
  initialAccountId?: string;
}

export const OpportunityForm = ({ opportunity, onSubmit, onCancel, initialAccountId }: OpportunityFormProps) => {
  const { accounts } = useAccounts();
  const { contacts } = useContacts();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from("profile").select("id, first_name, last_name");
      if (data) setUsers(data);
    };
    fetchUsers();
  }, []);

  const getDefaultValues = (opp: any) => ({
    opportunity_number: opp?.opportunity_number || "",
    account_id: opp?.account_id || initialAccountId || "",
    primary_contact_id: opp?.primary_contact_id || "",
    name: opp?.name || "",
    stage: opp?.stage || "Prospecting",
    amount: opp?.amount?.toString() || "",
    probability: opp?.probability?.toString() || "",
    close_date: opp?.close_date || "",
    description: opp?.description || "",
    opp_type: opp?.opp_type || "",
    sub_type: opp?.sub_type || "",
    total_contract_value: opp?.total_contract_value?.toString() || "",
    sales_support_notes: opp?.sales_support_notes || "",
    active_contract: opp?.active_contract || false,
    actual_close_date: opp?.actual_close_date || "",
    contract_start_date: opp?.contract_start_date || "",
    forecast_category: opp?.forecast_category || "",
    loss_reason: opp?.loss_reason || "",
    loss_reason_note: opp?.loss_reason_note || "",
    rfp: opp?.rfp || false,
    rfp_stage: opp?.rfp_stage || "",
    response_deadline: opp?.response_deadline || "",
    rfp_website: opp?.rfp_website || "",
    rfp_notes: opp?.rfp_notes || "",
    rfp_shipped_date: opp?.rfp_shipped_date || "",
    co_salesperson_id: opp?.co_salesperson_id || "",
    engineer_id: opp?.engineer_id || "",
    mentor_id: opp?.mentor_id || "",
    market_consultant_id: opp?.market_consultant_id || "",
    mc_assigned_date: opp?.mc_assigned_date || "",
    market_consultant_2_id: opp?.market_consultant_2_id || "",
    mc_2_assigned_date: opp?.mc_2_assigned_date || "",
    legacy_owner: opp?.legacy_owner || "",
    legacy_created_date: opp?.legacy_created_date || "",
    drf_received_date: opp?.drf_received_date || "",
    drf_primary_contact_id: opp?.drf_primary_contact_id || "",
    drf_submitter_name: opp?.drf_submitter_name || "",
    drf_submitter_email: opp?.drf_submitter_email || "",
    drf_submitter_title: opp?.drf_submitter_title || "",
    drf_submitter_phone: opp?.drf_submitter_phone || "",
    number_of_employees: opp?.number_of_employees?.toString() || "",
    hours_of_operation: opp?.hours_of_operation || "",
    number_of_buildings: opp?.number_of_buildings?.toString() || "",
    jointly_owned_buildings: opp?.jointly_owned_buildings || "",
    square_footage: opp?.square_footage?.toString() || "",
    number_of_schools_campuses: opp?.number_of_schools_campuses?.toString() || "",
    membership_enrollment: opp?.membership_enrollment?.toString() || "",
    cost_per_student: opp?.cost_per_student?.toString() || "",
    cost_per_square_foot: opp?.cost_per_square_foot?.toString() || "",
    electricity_current: opp?.electricity_current?.toString() || "",
    solar_current: opp?.solar_current?.toString() || "",
    natural_gas_current: opp?.natural_gas_current?.toString() || "",
    water_sewer_current: opp?.water_sewer_current?.toString() || "",
    heating_oil_current: opp?.heating_oil_current?.toString() || "",
    other_utility_current: opp?.other_utility_current?.toString() || "",
    other_utility_type: opp?.other_utility_type || "",
    annual_utility_costs: opp?.annual_utility_costs?.toString() || "",
    reporting_period_start_actuals: opp?.reporting_period_start_actuals || "",
    reporting_period_end_actuals: opp?.reporting_period_end_actuals || "",
    reporting_period: opp?.reporting_period || "",
    budgeted_electricity: opp?.budgeted_electricity?.toString() || "",
    budgeted_solar: opp?.budgeted_solar?.toString() || "",
    budgeted_natural_gas: opp?.budgeted_natural_gas?.toString() || "",
    budgeted_water_sewer: opp?.budgeted_water_sewer?.toString() || "",
    budgeted_heating_oil: opp?.budgeted_heating_oil?.toString() || "",
    budgeted_other_expense: opp?.budgeted_other_expense?.toString() || "",
    budgeted_annual_utility_costs: opp?.budgeted_annual_utility_costs?.toString() || "",
    reporting_period_start_budget: opp?.reporting_period_start_budget || "",
    reporting_period_end_budget: opp?.reporting_period_end_budget || "",
    budgeted_exp_reporting_period: opp?.budgeted_exp_reporting_period || "",
    budgeted_exp_reporting_period_mos: opp?.budgeted_exp_reporting_period_mos?.toString() || "",
    electricity_vendor: opp?.electricity_vendor || "",
    sites_powered_solar_next_2yrs: opp?.sites_powered_solar_next_2yrs || "",
    water_treatment_plants: opp?.water_treatment_plants || false,
    number_of_water_treatment_plants: opp?.number_of_water_treatment_plants?.toString() || "",
    utility_dept_allocation: opp?.utility_dept_allocation || "",
    central_heating_cooling_plant: opp?.central_heating_cooling_plant || false,
    smart_meters: opp?.smart_meters || "",
    smart_meter_count: opp?.smart_meter_count?.toString() || "",
    smart_meter_percentage: opp?.smart_meter_percentage?.toString() || "",
    interval_data: opp?.interval_data || "",
    sq_footage_central_plant: opp?.sq_footage_central_plant?.toString() || "",
    generate_own_power: opp?.generate_own_power || false,
    buildings_served_central_plant: opp?.buildings_served_central_plant?.toString() || "",
    allocate_plant_costs: opp?.allocate_plant_costs || false,
    buildings_wind: opp?.buildings_wind?.toString() || "",
    buildings_cogeneration: opp?.buildings_cogeneration?.toString() || "",
    buildings_battery: opp?.buildings_battery?.toString() || "",
    additional_sqft_planned_2yrs: opp?.additional_sqft_planned_2yrs?.toString() || "",
    additional_sqft_planned: opp?.additional_sqft_planned?.toString() || "",
    energy_accounting_software: opp?.energy_accounting_software || "",
    profile_notes: opp?.profile_notes || "",
    included_all_expenditures: opp?.included_all_expenditures || false,
    hospital_square_footage: opp?.hospital_square_footage?.toString() || "",
    number_of_hospitals: opp?.number_of_hospitals?.toString() || "",
    outpatient_center_sqft: opp?.outpatient_center_sqft?.toString() || "",
    number_of_outpatient_clinics: opp?.number_of_outpatient_clinics?.toString() || "",
    medical_office_sqft: opp?.medical_office_sqft?.toString() || "",
    number_professional_office_bldgs: opp?.number_professional_office_bldgs?.toString() || "",
    clinics_square_footage: opp?.clinics_square_footage?.toString() || "",
    hospital_beds: opp?.hospital_beds?.toString() || "",
    other_healthcare_sqft: opp?.other_healthcare_sqft?.toString() || "",
    onsite_electrical_generation_kw: opp?.onsite_electrical_generation_kw?.toString() || "",
    onsite_electrical_generation_type: opp?.onsite_electrical_generation_type || "",
    senior_pastor: opp?.senior_pastor || "",
    executive_pastor: opp?.executive_pastor || "",
    church_membership_enrollment: opp?.church_membership_enrollment?.toString() || "",
    average_weekly_attendance: opp?.average_weekly_attendance?.toString() || "",
    // Matrix fields
    matrix_approved_date: opp?.matrix_approved_date || "",
    contract_term_months: opp?.contract_term_months?.toString() || "",
    billable_term_months: opp?.billable_term_months?.toString() || "",
    perf_fee_percent: opp?.perf_fee_percent?.toString() || "",
    fee_type: opp?.fee_type || "",
    qs_months: opp?.qs_months?.toString() || "",
    billing_type: opp?.billing_type || "",
    matrix_utility_spend: opp?.matrix_utility_spend?.toString() || "",
    new_contracts_gross_monthly_fee: opp?.new_contracts_gross_monthly_fee?.toString() || "",
    new_contracts_gross_annual_fee: opp?.new_contracts_gross_annual_fee?.toString() || "",
    estimated_net_monthly_fee: opp?.estimated_net_monthly_fee?.toString() || "",
    estimated_net_annual_fee: opp?.estimated_net_annual_fee?.toString() || "",
    fixed_annual_fee: opp?.fixed_annual_fee?.toString() || "",
    gross_monthly_fee_py1: opp?.gross_monthly_fee_py1?.toString() || "",
    gross_monthly_fee_py2: opp?.gross_monthly_fee_py2?.toString() || "",
    gross_monthly_fee_py3: opp?.gross_monthly_fee_py3?.toString() || "",
    gross_monthly_fee_py4: opp?.gross_monthly_fee_py4?.toString() || "",
    gross_monthly_fee_py5: opp?.gross_monthly_fee_py5?.toString() || "",
    gross_monthly_fee_py6: opp?.gross_monthly_fee_py6?.toString() || "",
    net_monthly_fee_py1: opp?.net_monthly_fee_py1?.toString() || "",
    net_monthly_fee_py2: opp?.net_monthly_fee_py2?.toString() || "",
    net_monthly_fee_py3: opp?.net_monthly_fee_py3?.toString() || "",
    net_monthly_fee_py4: opp?.net_monthly_fee_py4?.toString() || "",
    net_monthly_fee_py5: opp?.net_monthly_fee_py5?.toString() || "",
    net_monthly_fee_py6: opp?.net_monthly_fee_py6?.toString() || "",
    software_type: opp?.software_type || "",
    discount_percent: opp?.discount_percent?.toString() || "",
    greenx_annual_allocation: opp?.greenx_annual_allocation?.toString() || "",
    ecap_software_fee: opp?.ecap_software_fee?.toString() || "",
    simulate_annual_allocation: opp?.simulate_annual_allocation?.toString() || "",
    ecap_fee_payments: opp?.ecap_fee_payments?.toString() || "",
    executive_annual_allocation: opp?.executive_annual_allocation?.toString() || "",
    ecap_maintenance_fee: opp?.ecap_maintenance_fee?.toString() || "",
    measure_annual_allocation: opp?.measure_annual_allocation?.toString() || "",
    ecap_renewal_payments: opp?.ecap_renewal_payments?.toString() || "",
    es_employed_by: opp?.es_employed_by || "",
    es_estimated_salary_annual: opp?.es_estimated_salary_annual?.toString() || "",
    es_ft: opp?.es_ft?.toString() || "",
    es_estimated_salary_monthly: opp?.es_estimated_salary_monthly?.toString() || "",
    es_pt: opp?.es_pt?.toString() || "",
    visits_per_month: opp?.visits_per_month?.toString() || "",
    savings_percent: opp?.savings_percent?.toString() || "",
    qs_net_savings: opp?.qs_net_savings?.toString() || "",
    year_1_gross_savings: opp?.year_1_gross_savings?.toString() || "",
    year_1_net_savings: opp?.year_1_net_savings?.toString() || "",
    year_2_gross_savings: opp?.year_2_gross_savings?.toString() || "",
    year_2_net_savings: opp?.year_2_net_savings?.toString() || "",
    year_3_gross_savings: opp?.year_3_gross_savings?.toString() || "",
    year_3_net_savings: opp?.year_3_net_savings?.toString() || "",
    year_4_gross_savings: opp?.year_4_gross_savings?.toString() || "",
    year_4_net_savings: opp?.year_4_net_savings?.toString() || "",
    year_5_gross_savings: opp?.year_5_gross_savings?.toString() || "",
    year_5_net_savings: opp?.year_5_net_savings?.toString() || "",
    year_6_gross_savings: opp?.year_6_gross_savings?.toString() || "",
    year_6_net_savings: opp?.year_6_net_savings?.toString() || "",
    year_7_gross_savings: opp?.year_7_gross_savings?.toString() || "",
    year_7_net_savings: opp?.year_7_net_savings?.toString() || "",
    year_8_gross_savings: opp?.year_8_gross_savings?.toString() || "",
    year_8_net_savings: opp?.year_8_net_savings?.toString() || "",
    year_9_gross_savings: opp?.year_9_gross_savings?.toString() || "",
    year_9_net_savings: opp?.year_9_net_savings?.toString() || "",
    year_10_gross_savings: opp?.year_10_gross_savings?.toString() || "",
    year_10_net_savings: opp?.year_10_net_savings?.toString() || "",
    proposal_total_gross_savings: opp?.proposal_total_gross_savings?.toString() || "",
    proposal_total_net_savings: opp?.proposal_total_net_savings?.toString() || "",
    matrix_notes: opp?.matrix_notes || "",
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<OpportunityFormData>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: getDefaultValues(opportunity),
  });

  useEffect(() => {
    if (opportunity) {
      reset(getDefaultValues(opportunity));
    }
  }, [opportunity, reset]);

  const accountId = watch("account_id");
  const stage = watch("stage");
  const primaryContactId = watch("primary_contact_id");
  const oppType = watch("opp_type");
  const subType = watch("sub_type");
  const forecastCat = watch("forecast_category");
  const rfp = watch("rfp");
  const activeContract = watch("active_contract");

  const accountContacts = contacts?.filter(c => c.account_id === accountId);

  const parseNumeric = (val: string | undefined) => val ? parseFloat(val) : null;
  const parseInt_ = (val: string | undefined) => val ? parseInt(val) : null;

  const handleFormSubmit = (data: OpportunityFormData) => {
    const formattedData: any = {
      account_id: data.account_id,
      primary_contact_id: data.primary_contact_id || null,
      name: data.name,
      stage: data.stage,
      amount: parseNumeric(data.amount),
      probability: parseInt_(data.probability),
      close_date: data.close_date || null,
      description: data.description || null,
      opp_type: data.opp_type || null,
      sub_type: data.sub_type || null,
      total_contract_value: parseNumeric(data.total_contract_value),
      sales_support_notes: data.sales_support_notes || null,
      active_contract: data.active_contract || false,
      actual_close_date: data.actual_close_date || null,
      contract_start_date: data.contract_start_date || null,
      forecast_category: data.forecast_category || null,
      loss_reason: data.loss_reason || null,
      loss_reason_note: data.loss_reason_note || null,
      rfp: data.rfp || false,
      rfp_stage: data.rfp_stage || null,
      response_deadline: data.response_deadline || null,
      rfp_website: data.rfp_website || null,
      rfp_notes: data.rfp_notes || null,
      rfp_shipped_date: data.rfp_shipped_date || null,
      co_salesperson_id: data.co_salesperson_id || null,
      engineer_id: data.engineer_id || null,
      mentor_id: data.mentor_id || null,
      market_consultant_id: data.market_consultant_id || null,
      mc_assigned_date: data.mc_assigned_date || null,
      market_consultant_2_id: data.market_consultant_2_id || null,
      mc_2_assigned_date: data.mc_2_assigned_date || null,
      legacy_owner: data.legacy_owner || null,
      legacy_created_date: data.legacy_created_date || null,
      drf_received_date: data.drf_received_date || null,
      drf_primary_contact_id: data.drf_primary_contact_id || null,
      drf_submitter_name: data.drf_submitter_name || null,
      drf_submitter_email: data.drf_submitter_email || null,
      drf_submitter_title: data.drf_submitter_title || null,
      drf_submitter_phone: data.drf_submitter_phone || null,
      number_of_employees: parseInt_(data.number_of_employees),
      hours_of_operation: data.hours_of_operation || null,
      number_of_buildings: parseInt_(data.number_of_buildings),
      jointly_owned_buildings: data.jointly_owned_buildings || null,
      square_footage: parseNumeric(data.square_footage),
      number_of_schools_campuses: parseInt_(data.number_of_schools_campuses),
      membership_enrollment: parseInt_(data.membership_enrollment),
      cost_per_student: parseNumeric(data.cost_per_student),
      cost_per_square_foot: parseNumeric(data.cost_per_square_foot),
      electricity_current: parseNumeric(data.electricity_current),
      solar_current: parseNumeric(data.solar_current),
      natural_gas_current: parseNumeric(data.natural_gas_current),
      water_sewer_current: parseNumeric(data.water_sewer_current),
      heating_oil_current: parseNumeric(data.heating_oil_current),
      other_utility_current: parseNumeric(data.other_utility_current),
      other_utility_type: data.other_utility_type || null,
      annual_utility_costs: parseNumeric(data.annual_utility_costs),
      reporting_period_start_actuals: data.reporting_period_start_actuals || null,
      reporting_period_end_actuals: data.reporting_period_end_actuals || null,
      reporting_period: data.reporting_period || null,
      budgeted_electricity: parseNumeric(data.budgeted_electricity),
      budgeted_solar: parseNumeric(data.budgeted_solar),
      budgeted_natural_gas: parseNumeric(data.budgeted_natural_gas),
      budgeted_water_sewer: parseNumeric(data.budgeted_water_sewer),
      budgeted_heating_oil: parseNumeric(data.budgeted_heating_oil),
      budgeted_other_expense: parseNumeric(data.budgeted_other_expense),
      budgeted_annual_utility_costs: parseNumeric(data.budgeted_annual_utility_costs),
      reporting_period_start_budget: data.reporting_period_start_budget || null,
      reporting_period_end_budget: data.reporting_period_end_budget || null,
      budgeted_exp_reporting_period: data.budgeted_exp_reporting_period || null,
      budgeted_exp_reporting_period_mos: parseInt_(data.budgeted_exp_reporting_period_mos),
      electricity_vendor: data.electricity_vendor || null,
      sites_powered_solar_next_2yrs: data.sites_powered_solar_next_2yrs || null,
      water_treatment_plants: data.water_treatment_plants || false,
      number_of_water_treatment_plants: parseInt_(data.number_of_water_treatment_plants),
      utility_dept_allocation: data.utility_dept_allocation || null,
      central_heating_cooling_plant: data.central_heating_cooling_plant || false,
      smart_meters: data.smart_meters || null,
      smart_meter_count: parseInt_(data.smart_meter_count),
      smart_meter_percentage: parseNumeric(data.smart_meter_percentage),
      interval_data: data.interval_data || null,
      sq_footage_central_plant: parseNumeric(data.sq_footage_central_plant),
      generate_own_power: data.generate_own_power || false,
      buildings_served_central_plant: parseInt_(data.buildings_served_central_plant),
      allocate_plant_costs: data.allocate_plant_costs || false,
      buildings_wind: parseInt_(data.buildings_wind),
      buildings_cogeneration: parseInt_(data.buildings_cogeneration),
      buildings_battery: parseInt_(data.buildings_battery),
      additional_sqft_planned_2yrs: parseNumeric(data.additional_sqft_planned_2yrs),
      additional_sqft_planned: parseNumeric(data.additional_sqft_planned),
      energy_accounting_software: data.energy_accounting_software || null,
      profile_notes: data.profile_notes || null,
      included_all_expenditures: data.included_all_expenditures || false,
      hospital_square_footage: parseNumeric(data.hospital_square_footage),
      number_of_hospitals: parseInt_(data.number_of_hospitals),
      outpatient_center_sqft: parseNumeric(data.outpatient_center_sqft),
      number_of_outpatient_clinics: parseInt_(data.number_of_outpatient_clinics),
      medical_office_sqft: parseNumeric(data.medical_office_sqft),
      number_professional_office_bldgs: parseInt_(data.number_professional_office_bldgs),
      clinics_square_footage: parseNumeric(data.clinics_square_footage),
      hospital_beds: parseInt_(data.hospital_beds),
      other_healthcare_sqft: parseNumeric(data.other_healthcare_sqft),
      onsite_electrical_generation_kw: parseNumeric(data.onsite_electrical_generation_kw),
      onsite_electrical_generation_type: data.onsite_electrical_generation_type || null,
      senior_pastor: data.senior_pastor || null,
      executive_pastor: data.executive_pastor || null,
      church_membership_enrollment: parseInt_(data.church_membership_enrollment),
      average_weekly_attendance: parseInt_(data.average_weekly_attendance),
      // Matrix fields
      matrix_approved_date: data.matrix_approved_date || null,
      contract_term_months: parseInt_(data.contract_term_months),
      billable_term_months: parseInt_(data.billable_term_months),
      perf_fee_percent: parseNumeric(data.perf_fee_percent),
      fee_type: data.fee_type || null,
      qs_months: parseInt_(data.qs_months),
      billing_type: data.billing_type || null,
      matrix_utility_spend: parseNumeric(data.matrix_utility_spend),
      new_contracts_gross_monthly_fee: parseNumeric(data.new_contracts_gross_monthly_fee),
      new_contracts_gross_annual_fee: parseNumeric(data.new_contracts_gross_annual_fee),
      estimated_net_monthly_fee: parseNumeric(data.estimated_net_monthly_fee),
      estimated_net_annual_fee: parseNumeric(data.estimated_net_annual_fee),
      fixed_annual_fee: parseNumeric(data.fixed_annual_fee),
      gross_monthly_fee_py1: parseNumeric(data.gross_monthly_fee_py1),
      gross_monthly_fee_py2: parseNumeric(data.gross_monthly_fee_py2),
      gross_monthly_fee_py3: parseNumeric(data.gross_monthly_fee_py3),
      gross_monthly_fee_py4: parseNumeric(data.gross_monthly_fee_py4),
      gross_monthly_fee_py5: parseNumeric(data.gross_monthly_fee_py5),
      gross_monthly_fee_py6: parseNumeric(data.gross_monthly_fee_py6),
      net_monthly_fee_py1: parseNumeric(data.net_monthly_fee_py1),
      net_monthly_fee_py2: parseNumeric(data.net_monthly_fee_py2),
      net_monthly_fee_py3: parseNumeric(data.net_monthly_fee_py3),
      net_monthly_fee_py4: parseNumeric(data.net_monthly_fee_py4),
      net_monthly_fee_py5: parseNumeric(data.net_monthly_fee_py5),
      net_monthly_fee_py6: parseNumeric(data.net_monthly_fee_py6),
      software_type: data.software_type || null,
      discount_percent: parseNumeric(data.discount_percent),
      greenx_annual_allocation: parseNumeric(data.greenx_annual_allocation),
      ecap_software_fee: parseNumeric(data.ecap_software_fee),
      simulate_annual_allocation: parseNumeric(data.simulate_annual_allocation),
      ecap_fee_payments: parseInt_(data.ecap_fee_payments),
      executive_annual_allocation: parseNumeric(data.executive_annual_allocation),
      ecap_maintenance_fee: parseNumeric(data.ecap_maintenance_fee),
      measure_annual_allocation: parseNumeric(data.measure_annual_allocation),
      ecap_renewal_payments: parseInt_(data.ecap_renewal_payments),
      es_employed_by: data.es_employed_by || null,
      es_estimated_salary_annual: parseNumeric(data.es_estimated_salary_annual),
      es_ft: parseNumeric(data.es_ft),
      es_estimated_salary_monthly: parseNumeric(data.es_estimated_salary_monthly),
      es_pt: parseNumeric(data.es_pt),
      visits_per_month: parseInt_(data.visits_per_month),
      savings_percent: parseNumeric(data.savings_percent),
      qs_net_savings: parseNumeric(data.qs_net_savings),
      year_1_gross_savings: parseNumeric(data.year_1_gross_savings),
      year_1_net_savings: parseNumeric(data.year_1_net_savings),
      year_2_gross_savings: parseNumeric(data.year_2_gross_savings),
      year_2_net_savings: parseNumeric(data.year_2_net_savings),
      year_3_gross_savings: parseNumeric(data.year_3_gross_savings),
      year_3_net_savings: parseNumeric(data.year_3_net_savings),
      year_4_gross_savings: parseNumeric(data.year_4_gross_savings),
      year_4_net_savings: parseNumeric(data.year_4_net_savings),
      year_5_gross_savings: parseNumeric(data.year_5_gross_savings),
      year_5_net_savings: parseNumeric(data.year_5_net_savings),
      year_6_gross_savings: parseNumeric(data.year_6_gross_savings),
      year_6_net_savings: parseNumeric(data.year_6_net_savings),
      year_7_gross_savings: parseNumeric(data.year_7_gross_savings),
      year_7_net_savings: parseNumeric(data.year_7_net_savings),
      year_8_gross_savings: parseNumeric(data.year_8_gross_savings),
      year_8_net_savings: parseNumeric(data.year_8_net_savings),
      year_9_gross_savings: parseNumeric(data.year_9_gross_savings),
      year_9_net_savings: parseNumeric(data.year_9_net_savings),
      year_10_gross_savings: parseNumeric(data.year_10_gross_savings),
      year_10_net_savings: parseNumeric(data.year_10_net_savings),
      proposal_total_gross_savings: parseNumeric(data.proposal_total_gross_savings),
      proposal_total_net_savings: parseNumeric(data.proposal_total_net_savings),
      matrix_notes: data.matrix_notes || null,
    };
    onSubmit(opportunity ? { opportunity_id: opportunity.opportunity_id, ...formattedData } : formattedData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="drf">DRF</TabsTrigger>
          <TabsTrigger value="energy">Energy</TabsTrigger>
          <TabsTrigger value="matrix">Matrix</TabsTrigger>
          <TabsTrigger value="additional">Additional</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="opportunity_number">Opportunity Number</Label>
            <Input 
              id="opportunity_number" 
              value={watch("opportunity_number") || "Will be auto-generated"}
              readOnly 
              className="bg-muted"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_id">Organization *</Label>
              <Select value={accountId || undefined} onValueChange={(value) => setValue("account_id", value)}>
                <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                <SelectContent>
                  {accounts?.map((account) => (
                    <SelectItem key={account.account_id} value={account.account_id}>{account.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.account_id && <p className="text-sm text-destructive">{errors.account_id.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary_contact_id">Primary Contact</Label>
              <Select value={primaryContactId || undefined} onValueChange={(value) => setValue("primary_contact_id", value)}>
                <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                <SelectContent>
                  {accountContacts?.map((contact) => (
                    <SelectItem key={contact.contact_id} value={contact.contact_id}>{contact.first_name} {contact.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Opportunity Name *</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="opp_type">Type</Label>
              <Select value={oppType || undefined} onValueChange={(value) => setValue("opp_type", value)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {oppTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sub_type">Sub-Type</Label>
              <Select value={subType || undefined} onValueChange={(value) => setValue("sub_type", value)}>
                <SelectTrigger><SelectValue placeholder="Select sub-type" /></SelectTrigger>
                <SelectContent>
                  {subTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage">Stage *</Label>
              <Select value={stage || undefined} onValueChange={(value) => setValue("stage", value)}>
                <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>
                  {stages.map((stg) => <SelectItem key={stg} value={stg}>{stg}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.stage && <p className="text-sm text-destructive">{errors.stage.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="forecast_category">Forecast Category</Label>
              <Select value={forecastCat || undefined} onValueChange={(value) => setValue("forecast_category", value)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {forecastCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" step="0.01" {...register("amount")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_contract_value">Total Contract Value</Label>
              <Input id="total_contract_value" type="number" step="0.01" {...register("total_contract_value")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="probability">Probability (%)</Label>
              <Input id="probability" type="number" min="0" max="100" {...register("probability")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="close_date">Estimated Close Date</Label>
              <Input id="close_date" type="date" {...register("close_date")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actual_close_date">Actual Close Date</Label>
              <Input id="actual_close_date" type="date" {...register("actual_close_date")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract_start_date">Contract Start Date</Label>
              <Input id="contract_start_date" type="date" {...register("contract_start_date")} />
            </div>

            <div className="space-y-2 flex items-center gap-2 pt-6">
              <Checkbox id="active_contract" checked={activeContract} onCheckedChange={(checked) => setValue("active_contract", !!checked)} />
              <Label htmlFor="active_contract" className="text-sm">Active Contract</Label>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sales_support_notes">Sales Support Notes</Label>
              <Textarea id="sales_support_notes" {...register("sales_support_notes")} rows={2} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} rows={3} />
            </div>
          </div>

          {/* Loss Details */}
          <h4 className="font-medium text-sm mt-4">Loss Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loss_reason">Loss Reason</Label>
              <Input id="loss_reason" {...register("loss_reason")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loss_reason_note">Loss Reason Note</Label>
              <Input id="loss_reason_note" {...register("loss_reason_note")} />
            </div>
          </div>

          {/* RFP */}
          <h4 className="font-medium text-sm mt-4">RFP</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 flex items-center gap-2">
              <Checkbox id="rfp" checked={rfp} onCheckedChange={(checked) => setValue("rfp", !!checked)} />
              <Label htmlFor="rfp" className="text-sm">RFP</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rfp_stage">RFP Stage</Label>
              <Input id="rfp_stage" {...register("rfp_stage")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="response_deadline">Response Deadline</Label>
              <Input id="response_deadline" type="date" {...register("response_deadline")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rfp_website">RFP Website</Label>
              <Input id="rfp_website" {...register("rfp_website")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rfp_shipped_date">RFP Shipped Date</Label>
              <Input id="rfp_shipped_date" type="date" {...register("rfp_shipped_date")} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="rfp_notes">RFP Notes</Label>
              <Textarea id="rfp_notes" {...register("rfp_notes")} rows={2} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="co_salesperson_id">Co Salesperson</Label>
              <Select value={watch("co_salesperson_id") || undefined} onValueChange={(value) => setValue("co_salesperson_id", value)}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="engineer_id">Engineer</Label>
              <Select value={watch("engineer_id") || undefined} onValueChange={(value) => setValue("engineer_id", value)}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mentor_id">Mentor</Label>
              <Select value={watch("mentor_id") || undefined} onValueChange={(value) => setValue("mentor_id", value)}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="market_consultant_id">Market Consultant</Label>
              <Select value={watch("market_consultant_id") || undefined} onValueChange={(value) => setValue("market_consultant_id", value)}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc_assigned_date">MC Assigned Date</Label>
              <Input id="mc_assigned_date" type="date" {...register("mc_assigned_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="market_consultant_2_id">Market Consultant #2</Label>
              <Select value={watch("market_consultant_2_id") || undefined} onValueChange={(value) => setValue("market_consultant_2_id", value)}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc_2_assigned_date">MC #2 Assigned Date</Label>
              <Input id="mc_2_assigned_date" type="date" {...register("mc_2_assigned_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legacy_owner">Legacy Owner</Label>
              <Input id="legacy_owner" {...register("legacy_owner")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legacy_created_date">Legacy Created Date</Label>
              <Input id="legacy_created_date" type="date" {...register("legacy_created_date")} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="drf" className="space-y-4 mt-4">
          <div className="rounded-lg border p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              DRF contacts are managed on the opportunity detail page after creation. You can add multiple DRF contacts there.
            </p>
            {opportunity?.drf_submitter_name && (
              <p className="text-sm mt-2">
                <span className="font-medium">Existing DRF:</span> {opportunity.drf_submitter_name}
                {opportunity.drf_submitter_email && ` (${opportunity.drf_submitter_email})`}
              </p>
            )}
          </div>

          <h4 className="font-medium text-sm mt-4">Overview</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="number_of_employees">Number of Employees</Label>
              <Input id="number_of_employees" type="number" {...register("number_of_employees")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours_of_operation">Hours of Operation</Label>
              <Input id="hours_of_operation" {...register("hours_of_operation")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number_of_buildings">Number of Buildings</Label>
              <Input id="number_of_buildings" type="number" {...register("number_of_buildings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jointly_owned_buildings">Jointly Owned/Operated Buildings</Label>
              <Input id="jointly_owned_buildings" {...register("jointly_owned_buildings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="square_footage">Square Footage</Label>
              <Input id="square_footage" type="number" step="0.01" {...register("square_footage")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number_of_schools_campuses">Number of Schools/Campuses</Label>
              <Input id="number_of_schools_campuses" type="number" {...register("number_of_schools_campuses")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="membership_enrollment">Membership Enrollment</Label>
              <Input id="membership_enrollment" type="number" {...register("membership_enrollment")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_per_student">Cost per Student</Label>
              <Input id="cost_per_student" type="number" step="0.01" {...register("cost_per_student")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_per_square_foot">Cost per Square Foot</Label>
              <Input id="cost_per_square_foot" type="number" step="0.01" {...register("cost_per_square_foot")} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="energy" className="space-y-4 mt-4">
          <h4 className="font-medium text-sm">Energy Expenditures - Current</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="electricity_current">Electricity</Label>
              <Input id="electricity_current" type="number" step="0.01" {...register("electricity_current")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="solar_current">Solar</Label>
              <Input id="solar_current" type="number" step="0.01" {...register("solar_current")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="natural_gas_current">Natural Gas</Label>
              <Input id="natural_gas_current" type="number" step="0.01" {...register("natural_gas_current")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="water_sewer_current">Water/Sewer</Label>
              <Input id="water_sewer_current" type="number" step="0.01" {...register("water_sewer_current")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heating_oil_current">Heating Oil</Label>
              <Input id="heating_oil_current" type="number" step="0.01" {...register("heating_oil_current")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="other_utility_current">Other</Label>
              <Input id="other_utility_current" type="number" step="0.01" {...register("other_utility_current")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="other_utility_type">Other Utility Type</Label>
              <Input id="other_utility_type" {...register("other_utility_type")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annual_utility_costs">Annual Utility Costs</Label>
              <Input id="annual_utility_costs" type="number" step="0.01" {...register("annual_utility_costs")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reporting_period_start_actuals">Reporting Period Start (Actuals)</Label>
              <Input id="reporting_period_start_actuals" type="date" {...register("reporting_period_start_actuals")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reporting_period_end_actuals">Reporting Period End (Actuals)</Label>
              <Input id="reporting_period_end_actuals" type="date" {...register("reporting_period_end_actuals")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reporting_period">Reporting Period</Label>
              <Input id="reporting_period" {...register("reporting_period")} />
            </div>
          </div>

          <h4 className="font-medium text-sm mt-4">Energy Expenditures - Budget</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budgeted_electricity">Budgeted Electricity</Label>
              <Input id="budgeted_electricity" type="number" step="0.01" {...register("budgeted_electricity")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgeted_solar">Budgeted Solar</Label>
              <Input id="budgeted_solar" type="number" step="0.01" {...register("budgeted_solar")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgeted_natural_gas">Budgeted Natural Gas</Label>
              <Input id="budgeted_natural_gas" type="number" step="0.01" {...register("budgeted_natural_gas")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgeted_water_sewer">Budgeted Water/Sewer</Label>
              <Input id="budgeted_water_sewer" type="number" step="0.01" {...register("budgeted_water_sewer")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgeted_heating_oil">Budgeted Heating Oil</Label>
              <Input id="budgeted_heating_oil" type="number" step="0.01" {...register("budgeted_heating_oil")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgeted_other_expense">Budgeted Other Expense</Label>
              <Input id="budgeted_other_expense" type="number" step="0.01" {...register("budgeted_other_expense")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgeted_annual_utility_costs">Budgeted Annual Utility Costs</Label>
              <Input id="budgeted_annual_utility_costs" type="number" step="0.01" {...register("budgeted_annual_utility_costs")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reporting_period_start_budget">Reporting Period Start (Budget)</Label>
              <Input id="reporting_period_start_budget" type="date" {...register("reporting_period_start_budget")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reporting_period_end_budget">Reporting Period End (Budget)</Label>
              <Input id="reporting_period_end_budget" type="date" {...register("reporting_period_end_budget")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgeted_exp_reporting_period">Budgeted Exp Reporting Period</Label>
              <Input id="budgeted_exp_reporting_period" {...register("budgeted_exp_reporting_period")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgeted_exp_reporting_period_mos">Budgeted Exp Reporting Period (Mos)</Label>
              <Input id="budgeted_exp_reporting_period_mos" type="number" {...register("budgeted_exp_reporting_period_mos")} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="matrix" className="space-y-4 mt-4">
          <h4 className="font-medium text-sm">Matrix Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="matrix_approved_date">Matrix Approved Date</Label>
              <Input id="matrix_approved_date" type="date" {...register("matrix_approved_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract_term_months">Contract Term Months</Label>
              <Input id="contract_term_months" type="number" {...register("contract_term_months")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billable_term_months">Billable Term Months</Label>
              <Input id="billable_term_months" type="number" {...register("billable_term_months")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qs_months">QS Months</Label>
              <Input id="qs_months" type="number" {...register("qs_months")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="perf_fee_percent">Perf Fee %</Label>
              <Input id="perf_fee_percent" type="number" step="0.01" {...register("perf_fee_percent")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee_type">Fee Type</Label>
              <Input id="fee_type" {...register("fee_type")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing_type">Billing Type</Label>
              <Input id="billing_type" {...register("billing_type")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matrix_utility_spend">Matrix Utility Spend</Label>
              <Input id="matrix_utility_spend" type="number" step="0.01" {...register("matrix_utility_spend")} />
            </div>
          </div>

          <h4 className="font-medium text-sm mt-4">Fees</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new_contracts_gross_monthly_fee">New Contracts Gross Monthly Fee</Label>
              <Input id="new_contracts_gross_monthly_fee" type="number" step="0.01" {...register("new_contracts_gross_monthly_fee")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fixed_annual_fee">Fixed Annual Fee</Label>
              <Input id="fixed_annual_fee" type="number" step="0.01" {...register("fixed_annual_fee")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_contracts_gross_annual_fee">New Contracts Gross Annual Fee</Label>
              <Input id="new_contracts_gross_annual_fee" type="number" step="0.01" {...register("new_contracts_gross_annual_fee")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimated_net_monthly_fee">Estimated Net Monthly Fee</Label>
              <Input id="estimated_net_monthly_fee" type="number" step="0.01" {...register("estimated_net_monthly_fee")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimated_net_annual_fee">Estimated Net Annual Fee</Label>
              <Input id="estimated_net_annual_fee" type="number" step="0.01" {...register("estimated_net_annual_fee")} />
            </div>
          </div>

          <h4 className="font-medium text-sm mt-4">Gross/Net Monthly Fees By Year</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gross_monthly_fee_py1">Gross Monthly Fee PY1</Label>
              <Input id="gross_monthly_fee_py1" type="number" step="0.01" {...register("gross_monthly_fee_py1")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="net_monthly_fee_py1">Net Monthly Fee PY1</Label>
              <Input id="net_monthly_fee_py1" type="number" step="0.01" {...register("net_monthly_fee_py1")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gross_monthly_fee_py2">Gross Monthly Fee PY2</Label>
              <Input id="gross_monthly_fee_py2" type="number" step="0.01" {...register("gross_monthly_fee_py2")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="net_monthly_fee_py2">Net Monthly Fee PY2</Label>
              <Input id="net_monthly_fee_py2" type="number" step="0.01" {...register("net_monthly_fee_py2")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gross_monthly_fee_py3">Gross Monthly Fee PY3</Label>
              <Input id="gross_monthly_fee_py3" type="number" step="0.01" {...register("gross_monthly_fee_py3")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="net_monthly_fee_py3">Net Monthly Fee PY3</Label>
              <Input id="net_monthly_fee_py3" type="number" step="0.01" {...register("net_monthly_fee_py3")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gross_monthly_fee_py4">Gross Monthly Fee PY4</Label>
              <Input id="gross_monthly_fee_py4" type="number" step="0.01" {...register("gross_monthly_fee_py4")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="net_monthly_fee_py4">Net Monthly Fee PY4</Label>
              <Input id="net_monthly_fee_py4" type="number" step="0.01" {...register("net_monthly_fee_py4")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gross_monthly_fee_py5">Gross Monthly Fee PY5</Label>
              <Input id="gross_monthly_fee_py5" type="number" step="0.01" {...register("gross_monthly_fee_py5")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="net_monthly_fee_py5">Net Monthly Fee PY5</Label>
              <Input id="net_monthly_fee_py5" type="number" step="0.01" {...register("net_monthly_fee_py5")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gross_monthly_fee_py6">Gross Monthly Fee PY6</Label>
              <Input id="gross_monthly_fee_py6" type="number" step="0.01" {...register("gross_monthly_fee_py6")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="net_monthly_fee_py6">Net Monthly Fee PY6</Label>
              <Input id="net_monthly_fee_py6" type="number" step="0.01" {...register("net_monthly_fee_py6")} />
            </div>
          </div>

          <h4 className="font-medium text-sm mt-4">Software</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="software_type">Software Type</Label>
              <Input id="software_type" {...register("software_type")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount_percent">Discount %</Label>
              <Input id="discount_percent" type="number" step="0.01" {...register("discount_percent")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="greenx_annual_allocation">GreenX Annual Allocation</Label>
              <Input id="greenx_annual_allocation" type="number" step="0.01" {...register("greenx_annual_allocation")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ecap_software_fee">eCAP Software Fee</Label>
              <Input id="ecap_software_fee" type="number" step="0.01" {...register("ecap_software_fee")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="simulate_annual_allocation">Simulate Annual Allocation</Label>
              <Input id="simulate_annual_allocation" type="number" step="0.01" {...register("simulate_annual_allocation")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ecap_fee_payments"># eCAP Fee Payments</Label>
              <Input id="ecap_fee_payments" type="number" {...register("ecap_fee_payments")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="executive_annual_allocation">Executive Annual Allocation</Label>
              <Input id="executive_annual_allocation" type="number" step="0.01" {...register("executive_annual_allocation")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ecap_maintenance_fee">eCAP Maintenance Fee</Label>
              <Input id="ecap_maintenance_fee" type="number" step="0.01" {...register("ecap_maintenance_fee")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="measure_annual_allocation">Measure Annual Allocation</Label>
              <Input id="measure_annual_allocation" type="number" step="0.01" {...register("measure_annual_allocation")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ecap_renewal_payments">Number ECAP Renewal Payments</Label>
              <Input id="ecap_renewal_payments" type="number" {...register("ecap_renewal_payments")} />
            </div>
          </div>

          <h4 className="font-medium text-sm mt-4">ES Staffing</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="es_employed_by">ES Employed By</Label>
              <Input id="es_employed_by" {...register("es_employed_by")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="es_estimated_salary_annual">ES Estimated Salary Annual</Label>
              <Input id="es_estimated_salary_annual" type="number" step="0.01" {...register("es_estimated_salary_annual")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="es_ft"># ES FT</Label>
              <Input id="es_ft" type="number" step="0.01" {...register("es_ft")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="es_estimated_salary_monthly">ES Estimated Salary Monthly</Label>
              <Input id="es_estimated_salary_monthly" type="number" step="0.01" {...register("es_estimated_salary_monthly")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="es_pt"># ES PT</Label>
              <Input id="es_pt" type="number" step="0.01" {...register("es_pt")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visits_per_month">Visits Per Month</Label>
              <Input id="visits_per_month" type="number" {...register("visits_per_month")} />
            </div>
          </div>

          <h4 className="font-medium text-sm mt-4">Savings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="savings_percent">Savings %</Label>
              <Input id="savings_percent" type="number" step="0.01" {...register("savings_percent")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qs_net_savings">QS Net Savings</Label>
              <Input id="qs_net_savings" type="number" step="0.01" {...register("qs_net_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_1_gross_savings">Year 1 Gross Savings</Label>
              <Input id="year_1_gross_savings" type="number" step="0.01" {...register("year_1_gross_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_1_net_savings">Year 1 Net Savings</Label>
              <Input id="year_1_net_savings" type="number" step="0.01" {...register("year_1_net_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_2_gross_savings">Year 2 Gross Savings</Label>
              <Input id="year_2_gross_savings" type="number" step="0.01" {...register("year_2_gross_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_2_net_savings">Year 2 Net Savings</Label>
              <Input id="year_2_net_savings" type="number" step="0.01" {...register("year_2_net_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_3_gross_savings">Year 3 Gross Savings</Label>
              <Input id="year_3_gross_savings" type="number" step="0.01" {...register("year_3_gross_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_3_net_savings">Year 3 Net Savings</Label>
              <Input id="year_3_net_savings" type="number" step="0.01" {...register("year_3_net_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_4_gross_savings">Year 4 Gross Savings</Label>
              <Input id="year_4_gross_savings" type="number" step="0.01" {...register("year_4_gross_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_4_net_savings">Year 4 Net Savings</Label>
              <Input id="year_4_net_savings" type="number" step="0.01" {...register("year_4_net_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_5_gross_savings">Year 5 Gross Savings</Label>
              <Input id="year_5_gross_savings" type="number" step="0.01" {...register("year_5_gross_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_5_net_savings">Year 5 Net Savings</Label>
              <Input id="year_5_net_savings" type="number" step="0.01" {...register("year_5_net_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_6_gross_savings">Year 6 Gross Savings</Label>
              <Input id="year_6_gross_savings" type="number" step="0.01" {...register("year_6_gross_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_6_net_savings">Year 6 Net Savings</Label>
              <Input id="year_6_net_savings" type="number" step="0.01" {...register("year_6_net_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_7_gross_savings">Year 7 Gross Savings</Label>
              <Input id="year_7_gross_savings" type="number" step="0.01" {...register("year_7_gross_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_7_net_savings">Year 7 Net Savings</Label>
              <Input id="year_7_net_savings" type="number" step="0.01" {...register("year_7_net_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_8_gross_savings">Year 8 Gross Savings</Label>
              <Input id="year_8_gross_savings" type="number" step="0.01" {...register("year_8_gross_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_8_net_savings">Year 8 Net Savings</Label>
              <Input id="year_8_net_savings" type="number" step="0.01" {...register("year_8_net_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_9_gross_savings">Year 9 Gross Savings</Label>
              <Input id="year_9_gross_savings" type="number" step="0.01" {...register("year_9_gross_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_9_net_savings">Year 9 Net Savings</Label>
              <Input id="year_9_net_savings" type="number" step="0.01" {...register("year_9_net_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_10_gross_savings">Year 10 Gross Savings</Label>
              <Input id="year_10_gross_savings" type="number" step="0.01" {...register("year_10_gross_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_10_net_savings">Year 10 Net Savings</Label>
              <Input id="year_10_net_savings" type="number" step="0.01" {...register("year_10_net_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proposal_total_gross_savings">Proposal Total Gross Savings</Label>
              <Input id="proposal_total_gross_savings" type="number" step="0.01" {...register("proposal_total_gross_savings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proposal_total_net_savings">Proposal Total Net Savings</Label>
              <Input id="proposal_total_net_savings" type="number" step="0.01" {...register("proposal_total_net_savings")} />
            </div>
          </div>

          <h4 className="font-medium text-sm mt-4">Matrix Notes</h4>
          <div className="space-y-2">
            <Textarea id="matrix_notes" {...register("matrix_notes")} rows={3} />
          </div>
        </TabsContent>

        <TabsContent value="additional" className="space-y-4 mt-4">
          <h4 className="font-medium text-sm">Additional Info</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="electricity_vendor">Electricity Vendor</Label>
              <Input id="electricity_vendor" {...register("electricity_vendor")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sites_powered_solar_next_2yrs">Sites Powered By Solar Next 2yrs</Label>
              <Input id="sites_powered_solar_next_2yrs" {...register("sites_powered_solar_next_2yrs")} />
            </div>
            <div className="space-y-2 flex items-center gap-2">
              <Checkbox id="water_treatment_plants" checked={watch("water_treatment_plants")} onCheckedChange={(checked) => setValue("water_treatment_plants", !!checked)} />
              <Label htmlFor="water_treatment_plants" className="text-sm">Water Treatment Plants</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="number_of_water_treatment_plants">Number of Water Treatment Plants</Label>
              <Input id="number_of_water_treatment_plants" type="number" {...register("number_of_water_treatment_plants")} />
            </div>
            <div className="space-y-2 flex items-center gap-2">
              <Checkbox id="central_heating_cooling_plant" checked={watch("central_heating_cooling_plant")} onCheckedChange={(checked) => setValue("central_heating_cooling_plant", !!checked)} />
              <Label htmlFor="central_heating_cooling_plant" className="text-sm">Central/Heating Cooling Plant</Label>
            </div>
            <div className="space-y-2 flex items-center gap-2">
              <Checkbox id="generate_own_power" checked={watch("generate_own_power")} onCheckedChange={(checked) => setValue("generate_own_power", !!checked)} />
              <Label htmlFor="generate_own_power" className="text-sm">Generate Own Power?</Label>
            </div>
            <div className="space-y-2 flex items-center gap-2">
              <Checkbox id="allocate_plant_costs" checked={watch("allocate_plant_costs")} onCheckedChange={(checked) => setValue("allocate_plant_costs", !!checked)} />
              <Label htmlFor="allocate_plant_costs" className="text-sm">Allocate Plant Costs?</Label>
            </div>
            <div className="space-y-2 flex items-center gap-2">
              <Checkbox id="included_all_expenditures" checked={watch("included_all_expenditures")} onCheckedChange={(checked) => setValue("included_all_expenditures", !!checked)} />
              <Label htmlFor="included_all_expenditures" className="text-sm">Included All Expenditures?</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="smart_meters">Smart Meters</Label>
              <Input id="smart_meters" {...register("smart_meters")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smart_meter_count">Smart Meter Count</Label>
              <Input id="smart_meter_count" type="number" {...register("smart_meter_count")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smart_meter_percentage">Smart Meter Percentage</Label>
              <Input id="smart_meter_percentage" type="number" step="0.01" {...register("smart_meter_percentage")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interval_data">Interval Data</Label>
              <Input id="interval_data" {...register("interval_data")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="energy_accounting_software">Energy Accounting Software</Label>
              <Input id="energy_accounting_software" {...register("energy_accounting_software")} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="profile_notes">Profile Notes</Label>
              <Textarea id="profile_notes" {...register("profile_notes")} rows={2} />
            </div>
          </div>

          <h4 className="font-medium text-sm mt-4">Healthcare Only</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hospital_square_footage">Hospital Square Footage</Label>
              <Input id="hospital_square_footage" type="number" step="0.01" {...register("hospital_square_footage")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number_of_hospitals">Number of Hospitals</Label>
              <Input id="number_of_hospitals" type="number" {...register("number_of_hospitals")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outpatient_center_sqft">Out-patient Center Sq. Ft.</Label>
              <Input id="outpatient_center_sqft" type="number" step="0.01" {...register("outpatient_center_sqft")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number_of_outpatient_clinics">Number of Outpatient Clinics</Label>
              <Input id="number_of_outpatient_clinics" type="number" {...register("number_of_outpatient_clinics")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hospital_beds">Hospital Beds</Label>
              <Input id="hospital_beds" type="number" {...register("hospital_beds")} />
            </div>
          </div>

          <h4 className="font-medium text-sm mt-4">Churches Only</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="senior_pastor">Senior Pastor</Label>
              <Input id="senior_pastor" {...register("senior_pastor")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="executive_pastor">Executive Pastor</Label>
              <Input id="executive_pastor" {...register("executive_pastor")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="church_membership_enrollment">Church Membership Enrollment</Label>
              <Input id="church_membership_enrollment" type="number" {...register("church_membership_enrollment")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="average_weekly_attendance">Average Weekly Attendance</Label>
              <Input id="average_weekly_attendance" type="number" {...register("average_weekly_attendance")} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{opportunity ? "Update" : "Create"} Opportunity</Button>
      </div>
    </form>
  );
};

