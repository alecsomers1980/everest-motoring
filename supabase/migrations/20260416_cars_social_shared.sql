alter table cars add column if not exists social_shared_at timestamptz;

comment on column cars.social_shared_at is 'Set when the vehicle has been shared to social media via Ember Social. NULL = never shared.';
