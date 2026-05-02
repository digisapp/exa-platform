alter table event_show_models
  add column if not exists check_in_status text not null default 'not_arrived';
