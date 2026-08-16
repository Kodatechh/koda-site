alter function public.factory_register_device(text,text,text,date,date,date,date,text,text) set search_path = public, extensions;
alter function public.begin_device_activation(text,text) set search_path = public, extensions;
alter function public.check_device_activation(uuid,text,text) set search_path = public, extensions;;
