@extends('errors::minimal')

@section('title', __('Something Went Wrong'))
@section('code', '500')
@section('message', __('An unexpected error happened on our side.'))
@section('hint', __('Please try again in a moment. If it keeps happening, contact the church office.'))
@section('icon', 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z')
