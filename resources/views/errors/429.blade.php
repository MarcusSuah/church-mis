@extends('errors::minimal')

@section('title', __('Too Many Requests'))
@section('code', '429')
@section('message', __("You've made too many requests in a short time."))
@section('hint', __('Please wait a minute, then try again.'))
@section('icon', 'M14.25 9v6m-4.5 0V9M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z')
