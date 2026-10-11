@extends('errors::minimal')

@section('title', __('Action Not Allowed'))
@section('code', '405')
@section('message', __("That action can't be done on this page."))
@section('hint', __('Go back and use the buttons on the page instead.'))
@section('icon', 'M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636')
