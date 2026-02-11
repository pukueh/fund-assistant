
try:
    from hello_agents.tools.base import Tool, ToolParameter, tool_action
    print("tool_action exists")
except ImportError as e:
    print(f"ImportError: {e}")
    try:
        import hello_agents.tools.base
        print("Module contents:", dir(hello_agents.tools.base))
    except Exception as e2:
        print(f"Error inspecting module: {e2}")
