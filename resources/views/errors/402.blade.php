@extends('errors::minimal')

@section('title', __('Payment Required'))
@section('code', '402')
@section('message', __('This feature is not available on the current plan.'))
@section('hint', __('Please contact the church office for help.'))
@section('icon', 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z')
