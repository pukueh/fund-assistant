
import functools
import logging

try:
    from hello_agents.tools.base import Tool, ToolParameter, tool_action
except ImportError:
    # Shim for tool_action if it's missing in the library version
    def tool_action(name=None, description=None):
        def decorator(func):
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                return func(*args, **kwargs)
            # Add metadata that Tool class might look for
            wrapper._tool_action_name = name or func.__name__
            wrapper._tool_action_description = description or func.__doc__
            wrapper._is_tool_action = True
            return wrapper
        return decorator
    
    from hello_agents.tools.base import Tool, ToolParameter
    logging.warning("hello_agents.tools.base.tool_action not found, using shim")

__all__ = ["Tool", "ToolParameter", "tool_action"]
